// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "Engine/EngineTypes.h"
#include "PixelStreamingSignallingConnection.h"

class IWebSocket;

class PixelStreamingStreamerInfo
{
public:
	FString StreamerId;
	FString PlayerId;
	FString CameraMode;
};


/**
 * A specialized signalling server connection object for web socket based Pixel Streaming signalling servers.
 */
class FPixelStreamingExtSignallingConnection : public FPixelStreamingSignallingConnection
{
public:
	FPixelStreamingExtSignallingConnection(TSharedPtr<IPixelStreamingSignallingConnectionObserver> InObserver, FString InStreamerId, TSharedPtr<PixelStreamingStreamerInfo> InStreamerInfo);
	virtual ~FPixelStreamingExtSignallingConnection();

	/* IPixelStreamingSignallingConnection Interface */
	virtual void SendOffer(FPixelStreamingPlayerId PlayerId, const webrtc::SessionDescriptionInterface& SDP) override;

private:
	using FJsonObjectPtr = TSharedPtr<FJsonObject>;
	void OnIdRequestedExt();
	void OnPlayerConnectedExt(const FJsonObjectPtr& Json);

public:
	virtual void SendDisconnectScene(const FString& SceneId, const FString& Reason) override;
	virtual void SendStreamerDataChannelsFailed(FPixelStreamingPlayerId PlayerId, const int SendStreamId, const int RecvStreamId) override;

private:
	void OnPlayerGoingAway(const FJsonObjectPtr& Json);
	void OnSfuConnected(const FJsonObjectPtr& Json);
	void OnSfuDisconnected(const FJsonObjectPtr& Json);

private:
	TSharedPtr<PixelStreamingStreamerInfo> StreamerInfo;
};
