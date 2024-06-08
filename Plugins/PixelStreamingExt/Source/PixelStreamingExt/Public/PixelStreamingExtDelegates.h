// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "PixelStreamingSceneId.h"
#include "Containers/UnrealString.h"
#include "Delegates/DelegateSignatureImpl.inl"
#include "GenericPlatform/GenericApplicationMessageHandler.h"
#include "PixelStreamingExtDelegates.generated.h"

UCLASS()
class PIXELSTREAMINGEXT_API UPixelStreamingExtDelegates : public UObject
{
	GENERATED_BODY()

public:
	// プレイヤーが接続したイベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FPlayerConnected, FString, PlayerId);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FPlayerConnected OnPlayerConnected;

	// プレイヤーが切断したイベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FPlayerDisconnected, FString, PlayerId, FString, MetaCommId);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FPlayerDisconnected OnPlayerDisconnected;

	// プレイヤーが切断したイベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FPlayerGoingAway, FString, PlayerId, FString, MetaCommId);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FPlayerGoingAway OnPlayerGoingAway;

	// カメラ切り替え準備応答受信イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FCameraSwitchPrepareResponse, FString, PlayerId, FString, SceneId, bool, Result);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FCameraSwitchPrepareResponse OnCameraSwitchPrepareResponse;

	// カメラ切り替え実施応答受信イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FCameraSwitchResponse, FString, PlayerId, FString, SceneId, bool, Result);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FCameraSwitchResponse OnCameraSwitchResponse;

	// カメラ切り替えキャンセル応答受信イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FCameraSwitchCancelResponse, FString, PlayerId, FString, SceneId, bool, Result);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FCameraSwitchCancelResponse OnCameraSwitchCancelResponse;

	// カメラ切り替え要求受信イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FCameraSelectRequest, FString, PlayerId, FString, MetaCommId, FString, SceneId);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FCameraSelectRequest OnCameraSelectRequest;
	// C++ Delegate
	DECLARE_MULTICAST_DELEGATE_ThreeParams(FOnCameraSelectRequestNative, FString, FString, FString);
	FOnCameraSelectRequestNative OnCameraSelectRequestNative;

	// onMouseUp イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnMouseUpEvent, FString, PlayerId, int32, Button, FVector2D, ScreenLocation);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FOnMouseUpEvent OnMouseUpEvent;

	// onMouseDown イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnMouseDownEvent, FString, PlayerId, int32, Button, FVector2D, ScreenLocation);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FOnMouseDownEvent OnMouseDownEvent;

	// onMouseMove イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnMouseMoveEvent, FString, PlayerId, FIntPoint, ScreenLocation, FIntPoint, Delta);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FOnMouseMoveEvent OnMouseMoveEvent;

	// onTouchStart イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnTouchStartEvent, FString, PlayerId, FVector2D, TouchLocation, int32, TouchForce, int32, TouchIndex);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FOnTouchStartEvent OnTouchStartEvent;

	// onTouchEnd イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnTouchEndEvent, FString, PlayerId, FVector2D, TouchLocation, int32, TouchForce, int32, TouchIndex);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FOnTouchEndEvent OnTouchEndEvent;

	// onTouchMove イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnTouchMoveEvent, FString, PlayerId, FVector2D, TouchLocation, int32, TouchForce, int32, TouchIndex);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Delegates")
	FOnTouchMoveEvent OnTouchMoveEvent;

	/**
	 * Create the singleton.
	 */
	static UPixelStreamingExtDelegates* CreateInstance();

	static UPixelStreamingExtDelegates* GetPixelStreamingExtDelegates()
	{
		if (Singleton == nullptr)
		{
			return CreateInstance();
		}
		return Singleton;
	}

private:
	// The singleton object.
	static UPixelStreamingExtDelegates* Singleton;
};
