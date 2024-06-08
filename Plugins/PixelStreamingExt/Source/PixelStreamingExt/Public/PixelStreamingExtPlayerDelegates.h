// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "PixelStreamingSceneId.h"
#include "Containers/UnrealString.h"
#include "Delegates/DelegateSignatureImpl.inl"
#include "GenericPlatform/GenericApplicationMessageHandler.h"
#include "PixelStreamingExtPlayerDelegates.generated.h"

UCLASS()
class PIXELSTREAMINGEXT_API UPixelStreamingExtPlayerDelegates : public UObject
{
	GENERATED_BODY()

public:
	// onMouseUp イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnMouseUpEvent, FString, PlayerId, int32, Button, FVector2D, ScreenLocation);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Player Delegates")
	FOnMouseUpEvent OnMouseUpEvent;

	// onMouseDown イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnMouseDownEvent, FString, PlayerId, int32, Button, FVector2D, ScreenLocation);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Player Delegates")
	FOnMouseDownEvent OnMouseDownEvent;

	// onMouseMove イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnMouseMoveEvent, FString, PlayerId, FIntPoint, ScreenLocation, FIntPoint, Delta);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Player Delegates")
	FOnMouseMoveEvent OnMouseMoveEvent;

	// onTouchStart イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnTouchStartEvent, FString, PlayerId, FVector2D, TouchLocation, int32, TouchForce, int32, TouchIndex);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Player Delegates")
	FOnTouchStartEvent OnTouchStartEvent;

	// onTouchEnd イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnTouchEndEvent, FString, PlayerId, FVector2D, TouchLocation, int32, TouchForce, int32, TouchIndex);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Player Delegates")
	FOnTouchEndEvent OnTouchEndEvent;

	// onTouchMove イベント
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnTouchMoveEvent, FString, PlayerId, FVector2D, TouchLocation, int32, TouchForce, int32, TouchIndex);
	UPROPERTY(BlueprintAssignable, Category = "Pixel Streaming Ext Player Delegates")
	FOnTouchMoveEvent OnTouchMoveEvent;
};
