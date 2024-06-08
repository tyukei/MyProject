// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintAsyncActionBase.h"
#include "SceneCaptureActorComponent.h"
#include "PixelStreamingExtAsyncAction.generated.h"

class FStreamerExt;
class UStartStreamingAsyncAction;
class UConnectingSignallingServerAsyncAction;

/**
 * ノード終了時に呼ぶデリゲート
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FStartStreamingAsyncActionCompleted);

class FStartStreamingAsync {
public:
	USceneCaptureActorComponent *SceneCapture;
	UStartStreamingAsyncAction *Action;
	FDelegateHandle StreamingStartedHandle;
public:
	FStartStreamingAsync();
	~FStartStreamingAsync();
	void Start();
	void OnStreamingCompleted(IPixelStreamingStreamer *InStreamer);
	void Remove();
};

UCLASS()
class PIXELSTREAMINGEXT_API UStartStreamingAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	/** ノードでの処理終了時に呼ぶデリゲート */
	UPROPERTY(BlueprintAssignable)
	FStartStreamingAsyncActionCompleted Completed;

private:
  FStartStreamingAsync Async;

public:
	UFUNCTION(BlueprintCallable, Category = "PixelStreamingExt", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = "true"))
	static UStartStreamingAsyncAction* StartStreamingAsync(const UObject* WorldContextObject, USceneCaptureActorComponent *SceneCapture);

	virtual void Activate() override;

	void OnStreamingStarted();
};

////////////////////////////////////////////////////////////////////////////////////////////////////


/**
 * ノード終了時に呼ぶデリゲート
 */
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FConnectingSignallingServerAsyncActionCompleted);

class FConnectingSignallingServerAsync {
public:
	USceneCaptureActorComponent *SceneCapture;
	UConnectingSignallingServerAsyncAction *Action;
	FDelegateHandle ConnectingSignallingHandle;
public:
	FConnectingSignallingServerAsync();
	~FConnectingSignallingServerAsync();
	void Start();
	void OnSignallingServerConnected(IPixelStreamingStreamer *InStreamer);
	void Remove();
};

UCLASS()
class PIXELSTREAMINGEXT_API UConnectingSignallingServerAsyncAction : public UBlueprintAsyncActionBase
{
	GENERATED_BODY()

public:
	/** ノードでの処理終了時に呼ぶデリゲート */
	UPROPERTY(BlueprintAssignable)
	FConnectingSignallingServerAsyncActionCompleted Completed;

private:
  FConnectingSignallingServerAsync Async;

public:
	UFUNCTION(BlueprintCallable, Category = "PixelStreamingExt", meta = (WorldContext = "WorldContextObject", BlueprintInternalUseOnly = "true"))
	static UConnectingSignallingServerAsyncAction* ConnectToSignallingServerAsync(const UObject* WorldContextObject, USceneCaptureActorComponent *SceneCapture);

	virtual void Activate() override;

	void OnSignallingServerConnected();
};
