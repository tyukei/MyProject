// Copyright Epic Games, Inc. All Rights Reserved.

#include "SignallingConnectionObserver.h"
#include "PlayerContext.h"
#include "PixelStreamingPrivate.h"

namespace UE::PixelStreaming
{
	FPixelStreamingSignallingConnectionObserver::FPixelStreamingSignallingConnectionObserver(FStreamer& InStreamer)
		: Streamer(InStreamer)
	{
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingConnected()
	{
		Streamer.OnStreamingStarted().Broadcast(&Streamer);
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingDisconnected(int32 StatusCode, const FString& Reason, bool bWasClean)
	{
		////////////////////////////////////////////////////////////////////////////////////////
		// PluginExt: START
		// Streamer.DeleteAllPlayerSessions();
		Streamer.DestroySFUSession();
		// PluginExt: END
		////////////////////////////////////////////////////////////////////////////////////////
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingError(const FString& ErrorMsg)
	{
		////////////////////////////////////////////////////////////////////////////////////////
		// PluginExt: START
		// Streamer.DeleteAllPlayerSessions();
		Streamer.DestroySFUSession();
		// PluginExt: END
		////////////////////////////////////////////////////////////////////////////////////////
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingConfig(const webrtc::PeerConnectionInterface::RTCConfiguration& Config)
	{
		Streamer.PeerConnectionConfig = Config;

		// We want periodic bandwidth probing so ramping happens quickly
		Streamer.PeerConnectionConfig.media_config.video.periodic_alr_bandwidth_probing = true;
	}

	// Streamer-only
	void FPixelStreamingSignallingConnectionObserver::OnSignallingSessionDescription(FPixelStreamingPlayerId PlayerId, webrtc::SdpType Type, const FString& Sdp)
	{
		switch (Type)
		{
			case webrtc::SdpType::kOffer:
				Streamer.OnOffer(PlayerId, Sdp);
				break;
			case webrtc::SdpType::kAnswer:
			case webrtc::SdpType::kPrAnswer:
			{
				Streamer.OnAnswer(PlayerId, Sdp);
				break;
			}
			case webrtc::SdpType::kRollback:
				UE_LOG(LogPixelStreaming, Error, TEXT("Rollback SDP is currently unsupported. SDP is: %s"), *Sdp);
				break;
		}
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingRemoteIceCandidate(FPixelStreamingPlayerId PlayerId, const FString& SdpMid, int SdpMLineIndex, const FString& Sdp)
	{
		if (FPlayerContext* PlayerContext = Streamer.Players.Find(PlayerId))
		{
			PlayerContext->PeerConnection->AddRemoteIceCandidate(SdpMid, SdpMLineIndex, Sdp);
		}
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingPlayerConnected(FPixelStreamingPlayerId PlayerId, const FPixelStreamingPlayerConfig& PlayerConfig, bool bSendOffer)
	{
		Streamer.OnPlayerConnected(PlayerId, PlayerConfig, bSendOffer);
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingPlayerDisconnected(FPixelStreamingPlayerId PlayerId)
	{
		///////////////////////////////////////////////////////////////////////////////////////////////////////
		// PluginExt: START
		// FStreamer にイベント渡すように修正しました。
		Streamer.OnPlayerDisconnected(PlayerId);

		// PlayerDisconencted ではセッションを削除しないように改修しますので
		// 以下の処理はコメントアウトしておきます。
		// UE_LOG(LogPixelStreaming, Log, TEXT("player %s disconnected"), *PlayerId);
		// Streamer.DeletePlayerSession(PlayerId);

		// PluginExt: END
		///////////////////////////////////////////////////////////////////////////////////////////////////////
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingSFUPeerDataChannels(FPixelStreamingPlayerId SFUId, FPixelStreamingPlayerId PlayerId, int32 SendStreamId, int32 RecvStreamId)
	{
		FPlayerContext* PlayerContext = Streamer.Players.Find(SFUId);
		if (PlayerContext == nullptr)
		{
			UE_LOG(LogPixelStreaming, Error, TEXT("Trying to create data channels from SFU connection but no SFU connection found."));
			return;
		}

		/* PSExt add start. */
		TSharedPtr<FPixelStreamingDataChannel> NewChannel = FPixelStreamingDataChannel::Create(*PlayerContext->PeerConnection, SendStreamId, RecvStreamId);
		if (NewChannel == nullptr)
		{
			UE_LOG(LogPixelStreaming, Error, TEXT("Failed to create data channels. PlayerId : %s, SendStreamId : %d, RecvStreamId : %d"), *PlayerId, SendStreamId, RecvStreamId);
			Streamer.OnStreamerDataChannelsFailed(PlayerId, SendStreamId, RecvStreamId);
			return;
		}
		/* PSExt add end. */
		Streamer.AddNewDataChannel(PlayerId, NewChannel);
	}

	// These are player only and will only be relevant when on the receiving side of pixel streaming, such as the player plugin.
	void FPixelStreamingSignallingConnectionObserver::OnSignallingStreamerList(const TArray<FString>& StreamerList)
	{
		unimplemented();
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingSessionDescription(webrtc::SdpType Type, const FString& Sdp)
	{
		unimplemented();
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingRemoteIceCandidate(const FString& SdpMid, int SdpMLineIndex, const FString& Sdp)
	{
		unimplemented();
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingPlayerCount(uint32 Count)
	{
		unimplemented();
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingPeerDataChannels(int32 SendStreamId, int32 RecvStreamId)
	{
		unimplemented();
	}

	///////////////////////////////////////////////////////////////////////////////////////////////////////
	// PluginExt: START
	void FPixelStreamingSignallingConnectionObserver::OnSignallingPlayerGoingAway(FPixelStreamingPlayerId PlayerId)
	{
		Streamer.OnPlayerGoingAway(PlayerId);
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingSfuConnected()
	{
		Streamer.OnSfuConnected();
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingSfuDisconnected()
	{
		Streamer.OnSfuDisconnected();
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingAIConnected(FPixelStreamingPlayerId PlayerId, const FPixelStreamingPlayerConfig& PlayerConfig, bool bSendOffer)
	{
		Streamer.OnAIConnected(PlayerId, PlayerConfig, bSendOffer);
	}

	void FPixelStreamingSignallingConnectionObserver::OnSignallingAIDisconnected(FPixelStreamingPlayerId PlayerId)
	{
		Streamer.OnAIDisconnected(PlayerId);
	}

	// PluginExt: END
	///////////////////////////////////////////////////////////////////////////////////////////////////////

} // namespace UE::PixelStreaming
