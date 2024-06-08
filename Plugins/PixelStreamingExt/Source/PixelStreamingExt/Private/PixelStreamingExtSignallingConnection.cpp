// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtSignallingConnection.h"

DEFINE_LOG_CATEGORY_STATIC(LogPixelStreamingExtSS, Log, VeryVerbose);

namespace UE::PixelStreaming
{
	inline FString ToString(const std::string& Str)
	{
		return UTF8_TO_TCHAR(Str.c_str());
	}

	inline FString ToString(const TSharedPtr<FJsonObject>& JsonObj, bool bPretty = true)
	{
		FString Res;
		if (bPretty)
		{
			auto JsonWriter = TJsonWriterFactory<TCHAR, TPrettyJsonPrintPolicy<TCHAR>>::Create(&Res);
			FJsonSerializer::Serialize(JsonObj.ToSharedRef(), JsonWriter);
		}
		else
		{
			auto JsonWriter = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Res);
			FJsonSerializer::Serialize(JsonObj.ToSharedRef(), JsonWriter);
		}
		return Res;
	}

} // namespace UE::PixelStreaming

FPixelStreamingExtSignallingConnection::FPixelStreamingExtSignallingConnection(TSharedPtr<IPixelStreamingSignallingConnectionObserver> InObserver, FString InStreamerId, TSharedPtr<PixelStreamingStreamerInfo> InStreamerInfo)
	: FPixelStreamingSignallingConnection(InObserver, InStreamerId), StreamerInfo(InStreamerInfo)
{
	RegisterHandler("identify", [this](FJsonObjectPtr JsonMsg) { OnIdRequestedExt(); });
	RegisterHandler("playerConnected", [this](FJsonObjectPtr JsonMsg) { OnPlayerConnectedExt(JsonMsg); });
	RegisterHandler("playerGoingAway", [this](FJsonObjectPtr JsonMsg) { OnPlayerGoingAway(JsonMsg); });
	RegisterHandler("sfuConnected", [this](FJsonObjectPtr JsonMsg) { OnSfuConnected(JsonMsg); });
	RegisterHandler("sfuDisconnected", [this](FJsonObjectPtr JsonMsg) { OnSfuDisconnected(JsonMsg); });
}

FPixelStreamingExtSignallingConnection::~FPixelStreamingExtSignallingConnection()
{
	Disconnect();
	StreamerInfo = nullptr;
}

void FPixelStreamingExtSignallingConnection::SendOffer(FPixelStreamingPlayerId PlayerId, const webrtc::SessionDescriptionInterface& SDP)
{
	FJsonObjectPtr OfferJson = MakeShared<FJsonObject>();
	OfferJson->SetStringField(TEXT("type"), TEXT("offer"));
	SetPlayerIdJson(OfferJson, PlayerId);

	// TODO: offer メッセージに sceneId を追加します。
	// シグナリングサーバで追加するので、ここでは不要かもしれないので検討が必要です。
	// JsonObject->SetStringField(TEXT("sceneId"), PlayerId);

	std::string SdpAnsi;
	SDP.ToString(&SdpAnsi);
	FString SdpStr = UE::PixelStreaming::ToString(SdpAnsi);
	OfferJson->SetStringField(TEXT("sdp"), SdpStr);

	UE_LOG(LogPixelStreamingExtSS, Log, TEXT("Sending player=%s \"offer\" to SS %s"), *PlayerId, *Url);
	UE_LOG(LogPixelStreamingExtSS, Verbose, TEXT("SDP offer\n%s"), *SdpStr);

	SendMessage(UE::PixelStreaming::ToString(OfferJson, false));
}


// This function returns the instance ID to the signalling server. This is useful for identifying individual instances in scalable cloud deployments
void FPixelStreamingExtSignallingConnection::OnIdRequestedExt()
{
	FJsonObjectPtr Json = MakeShared<FJsonObject>();
	Json->SetStringField(TEXT("type"), TEXT("endpointId"));
	Json->SetStringField(TEXT("id"), StreamerId);

	// Streamer の情報を JSON に格納します。
	if (StreamerInfo.IsValid())
	{
		Json->SetStringField(TEXT("playerId"), StreamerInfo->PlayerId);
		Json->SetStringField(TEXT("cameraMode"), StreamerInfo->CameraMode);
	}

	FString Msg = UE::PixelStreaming::ToString(Json, false);
	UE_LOG(LogPixelStreamingExtSS, Verbose, TEXT("-> SS: endpointId\n%s"), *Msg);
	SendMessage(Msg);
}

void FPixelStreamingExtSignallingConnection::OnPlayerConnectedExt(const FJsonObjectPtr& Json)
{
	FPixelStreamingPlayerId PlayerId;
	bool bGotPlayerId = GetPlayerIdJson(Json, PlayerId);
	if (!bGotPlayerId)
	{
		UE_LOG(LogPixelStreamingExtSS, Error, TEXT("Failed to get `playerId` from `join` message\n%s"), *UE::PixelStreaming::ToString(Json));
		return;
	}

	UE_LOG(LogPixelStreamingExtSS, Log, TEXT("Got player connected, player id=%s"), *PlayerId);

	FPixelStreamingPlayerConfig PlayerConfig;

	// Default to always making datachannel, unless explicitly set to false.
	Json->TryGetBoolField(TEXT("dataChannel"), PlayerConfig.SupportsDataChannel);

	// Default peer is not an SFU, unless explictly set as SFU
	Json->TryGetBoolField(TEXT("sfu"), PlayerConfig.IsSFU);

	// Default to always sending an offer, unless explicitly set to false
	// 基本的にはシグナリングサーバのレスポンスでは開始しないように修正しました。
	bool bSendOffer = false;
	// bool bSendOffer = true;
	Json->TryGetBoolField(TEXT("sendOffer"), bSendOffer);

	Observer->OnSignallingPlayerConnected(PlayerId, PlayerConfig, bSendOffer);
}

void FPixelStreamingExtSignallingConnection::OnPlayerGoingAway(const FJsonObjectPtr& Json)
{
	FPixelStreamingPlayerId PlayerId;
	bool bSuccess = GetPlayerIdJson(Json, PlayerId, TEXT("playerId"));
	if (!bSuccess)
	{
		UE_LOG(LogPixelStreamingExtSS, Error, TEXT("Failed to get `playerId` from `playerGoingAway` message\n%s"), *UE::PixelStreaming::ToString(Json));
		return;
	}

	Observer->OnSignallingPlayerGoingAway(PlayerId);
}

void FPixelStreamingExtSignallingConnection::OnSfuConnected(const FJsonObjectPtr& Json)
{
	Observer->OnSignallingSfuConnected();
}

void FPixelStreamingExtSignallingConnection::OnSfuDisconnected(const FJsonObjectPtr& Json)
{
	Observer->OnSignallingSfuDisconnected();
}

void FPixelStreamingExtSignallingConnection::SendDisconnectScene(const FString& SceneId, const FString& Reason)
{
	FJsonObjectPtr Json = MakeShared<FJsonObject>();

	Json->SetStringField(TEXT("type"), TEXT("disconnectScene"));
	Json->SetStringField(TEXT("sceneId"), SceneId);
	Json->SetStringField(TEXT("reason"), Reason);

	UE_LOG(LogPixelStreamingExtSS, Verbose, TEXT("-> SS: ice-candidate\n%s"), *UE::PixelStreaming::ToString(Json));

	SendMessage(UE::PixelStreaming::ToString(Json, false));
}

void FPixelStreamingExtSignallingConnection::SendStreamerDataChannelsFailed(FPixelStreamingPlayerId PlayerId, const int SendStreamId, const int RecvStreamId)
{
	FJsonObjectPtr Json = MakeShared<FJsonObject>();

	Json->SetStringField(TEXT("type"), TEXT("streamerDataChannelsFailed"));
	SetPlayerIdJson(Json, PlayerId);
	Json->SetNumberField(TEXT("sendStreamId"), SendStreamId);
	Json->SetNumberField(TEXT("recvStreamId"), RecvStreamId);

	SendMessage(UE::PixelStreaming::ToString(Json, false));
}

