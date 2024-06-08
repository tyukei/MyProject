#pragma once

#include "Engine/TextureRenderTarget2D.h"
#include "Misc/CoreDelegates.h"
#include "IPixelStreamingModule.h"
#include "IPixelStreamingStreamer.h"
#include "PixelCaptureInputFrameRHI.h"
#include "PixelStreamingInputProtocol.h"
#include "PixelStreamingInputProtocolMap.h"
#include "PixelStreamingVideoInput.h"
#include "PixelStreamingVideoInputRHI.h"
#include "PixelStreamingExtModule.h"
#include "PixelStreamingExtDelegates.h"
#include "GenericPlatform/GenericApplicationMessageHandler.h"
#include "PixelStreamingExtSignallingConnection.h"

class FStreamerExt
{
public:
	FStreamerExt(const FString& StreamerId, const FString& PlayerId, const FString& CameraMode);
	virtual ~FStreamerExt();

public:
	void CreateStreamer();
	void DestroyStreamer();
	void ConnectToSignallingServer();
	void DisconnectToSignallingServer();
	void StartStreaming();
	void StopStreaming();
	void SetVideoInput(TSharedPtr<FPixelStreamingVideoInput> Input);
	void SetTargetScreenRect(TSharedPtr<FIntRect> InScreenRect);
	void SendPlayerMessage(uint8 Type, const FString& Descriptor);
	void SendPlayerMessage(FPixelStreamingPlayerId PlayerId, uint8 Type, const FString& Descriptor);

public:
	TSharedPtr<IPixelStreamingStreamer> Streamer;

private:
	void HandleUIInteraction(FString PlayerId, FMemoryReader Ar);
	void HandleCameraSetRes(FString PlayerId, FMemoryReader Ar);
	void HandleCameraSwitchResponse(FMemoryReader Ar);
	void ProcessCameraSwitchResponse(const FString& InDescriptor);
	void ProcessCameraSwitchPrepareResponse(TSharedPtr<FJsonObject> JsonRootObject);
	void ProcessCameraSwitchResponse(TSharedPtr<FJsonObject> JsonRootObject);
	void ProcessCameraSwitchCancelResponse(TSharedPtr<FJsonObject> JsonRootObject);
	void ProcessCameraSelectRequest(TSharedPtr<FJsonObject> JsonRootObject);
	void HandleOnMouseUp(FString PlayerId, FMemoryReader Ar);
	void HandleOnMouseDown(FString PlayerId, FMemoryReader Ar);
	void HandleOnMouseMove(FString PlayerId, FMemoryReader Ar);
	void HandleOnTouchStarted(FString PlayerId, FMemoryReader Ar);
	void HandleOnTouchMoved(FString PlayerId, FMemoryReader Ar);
	void HandleOnTouchEnded(FString PlayerId, FMemoryReader Ar);
	void HandleResetBroadcastTouchMoveList();
	void HandleBroadcastTouchMoveList();
	FIntPoint ConvertFromNormalizedScreenLocation(const FVector2D& ScreenLocation, bool bIncludeOffset = false);

private:
	FPixelStreamingExtModule *ExtModule;
	UPixelStreamingExtDelegates* Delegates;
	TSharedPtr<PixelStreamingStreamerInfo> StreamerInfo;
	TSharedPtr<FIntRect> TargetScreenRect; // Manual size override used when we don't have a single window/viewport target
	float uint16_MAX = (float)UINT16_MAX;
	float int16_MAX = (float)SHRT_MAX;
	bool bUseMouseForTouch;

	struct FTouchMoveEvent
	{
		FVector2D Location;
		float Force;
	};

	struct FCachedTouchMoveEvent
	{
		TMap<int32, FTouchMoveEvent> TouchMoveEvents;
	};
	TMap<FString, FCachedTouchMoveEvent> CachedTouchMoveEvents;
	TSet<FString> TouchMoveIndicesProcessedThisFrame;

};
