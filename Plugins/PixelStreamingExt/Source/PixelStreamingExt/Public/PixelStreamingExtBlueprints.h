// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "Containers/Array.h"
#include "OSCClient.h"
#include "IPixelStreamingModule.h"
#include "IPixelStreamingStreamer.h"
#include "PixelStreamingExtDelegates.h"
#include "PixelStreamingExtBlueprints.generated.h"

UCLASS()
class PIXELSTREAMINGEXT_API UPixelStreamingExtBlueprints : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	// PixelStreamingDelegates
	/**
	 * Get the singleton. This allows application-specific blueprints to bind
	 * to delegates of interest.
	 */
	UFUNCTION(BlueprintCallable, Category = "PixelStreamingExt Delegates")
	static UPixelStreamingExtDelegates* GetPixelStreamingExtDelegates();

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Send Message on DataChannel", Keywords = "PixelStreamingExt Send Message"), Category = "PixelStreamingExt")
	static void PixelStreamingExtSendCustomMessage(const FString& PlayerId, const FString& Message);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Send Camera Switch Prepare Requset", Keywords = "PixelStreamingExt Camera Switch"), Category = "PixelStreamingExt")
	static void PixelStreamingExtSendCameraSwitchPrepareRequest(const FString& PlayerId, const FString& SceneId);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Send Camera Switch Requset", Keywords = "PixelStreamingExt Camera Switch"), Category = "PixelStreamingExt")
	static void PixelStreamingExtSendCameraSwitchRequest(const FString& PlayerId, const FString& SceneId);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Send Camera Switch Cancel Requset", Keywords = "PixelStreamingExt Camera Switch"), Category = "PixelStreamingExt")
	static void PixelStreamingExtSendCameraSwitchCancelRequest(const FString& PlayerId, const FString& SceneId);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Dispatch OSC Message", Keywords = "PixelStreamingExt OSC"), Category = "PixelStreamingExt")
	static void PixelStreamingExtDispatchOSCMessage(UPARAM(ref) FOSCMessage& Message);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Dispatch OSC Bundle", Keywords = "PixelStreamingExt OSC"), Category = "PixelStreamingExt")
	static void PixelStreamingExtDispatchOSCBundle(UPARAM(ref) FOSCBundle& Bundle);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Get PlayerId by MetaCommId", Keywords = "PixelStreamingExt Player Manager"), Category = "PixelStreamingExt")
	static FString PixelStreamingExtGetPlayerId(const FString& MetaCommId);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Get MetaCommId by PlayerId", Keywords = "PixelStreamingExt Player Manager"), Category = "PixelStreamingExt")
	static FString PixelStreamingExtGetMetaCommId(const FString& playerId);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Get Player Count", Keywords = "PixelStreamingExt Player Manager"), Category = "PixelStreamingExt")
	static int32 PixelStreamingExtGetPlayerCount();

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Get PixelStreamingExtPlayer Delegates", Keywords = "PixelStreamingExt Player Delegates"), Category = "PixelStreamingExt Player Delegates")
	static UPixelStreamingExtPlayerDelegates* GetPixelStreamingExtPlayerDelegates(const FString& playerId);

private:
	static void PixelStreamingExtSendMessage(const FString& PlayerId, uint8 Type, const FString& Message);

};
