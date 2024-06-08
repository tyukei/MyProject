// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "Modules/ModuleManager.h"
#include "PixelStreamingDelegates.h"
#include "PixelStreamingExtPlayerDelegates.h"

class UPixelStreamingExtInput;
class FPixelStreamingPlayerManager;
class FStreamerExt;

class FPixelStreamingExtModule : public IModuleInterface
{
public:

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	void AddInputComponent(UPixelStreamingExtInput* InInputComponent);
	void RemoveInputComponent(UPixelStreamingExtInput* InInputComponent);
	const TArray<UPixelStreamingExtInput*> GetInputComponents();
	int32 GetPlayerCount();
	FString GetMetaCommId(FPixelStreamingPlayerId InPlayerId);
	FString GetPlayerId(FString InMetaCommId);
	UPixelStreamingExtPlayerDelegates* GetPixelStreamingExtPlayerDelegates(FPixelStreamingPlayerId InPlayerId);
	UPixelStreamingExtPlayerDelegates* CreatePixelStreamingExtPlayerDelegates(FPixelStreamingPlayerId InPlayerId);
	bool RemovePixelStreamingExtPlayerDelegates(FPixelStreamingPlayerId InPlayerId);
	void ClearPixelStreamingExtPlayerDelegates();

	TSharedPtr<FStreamerExt> CreateStreamer(const FString& StreamerId, const FString& PlayerId, const FString& CameraMode);
	TSharedPtr<FStreamerExt> DeleteStreamer(const FString& StreamerId);
	TSharedPtr<FStreamerExt> FindStreamer(const FString& StreamerId);
	void ForEachStreamer(const TFunction<void(TSharedPtr<FStreamerExt>)>& Func);

private:
	void OnViewportCreatedHandler();

	void OnPlayerConnected(FString StreamerId, FPixelStreamingPlayerId PlayerId);
	void OnPlayerDisconnected(FString StreamerId, FPixelStreamingPlayerId PlayerId);
	void OnPlayerGoingAway(FString StreamerId, FPixelStreamingPlayerId PlayerId);
	void OnCameraSelectRequest(FString PlayerId, FString MetaCommId, FString SceneIdData);
	void OnDataChannelOpen(FString StreamerId, FPixelStreamingPlayerId PlayerId, FPixelStreamingDataChannel* DataChannel);

public:
	void OnDataChannelClosed(FString StreamerId, FPixelStreamingPlayerId PlayerId);

private:
	FDelegateHandle OnPlayerConnectedHandle;
	FDelegateHandle OnPlayerDisconnectedHandle;
	FDelegateHandle OnPlayerGoingAwayHandle;
	FDelegateHandle OnCameraSelectRequestHandle;
	FDelegateHandle OnDataChannelOpenHandle;
	FDelegateHandle OnDataChannelClosedHandle;

	mutable FCriticalSection StreamersCS;

	TSharedPtr<FPixelStreamingPlayerManager> PlayerManager;
	TArray<UPixelStreamingExtInput*> InputComponents;
	TMap<FPixelStreamingPlayerId, UPixelStreamingExtPlayerDelegates*> PlayerDelegatesMap;
	TMap<FString, TWeakPtr<FStreamerExt>> Streamers;
};
