// Fill out your copyright notice in the Description page of Project Settings.

#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "PixelStreamingVideoInput.h"
#include "PixelStreamingInputProtocol.h"
#include "PixelStreamingInputProtocolMap.h"
#include "PixelStreamingDelegates.h"
#include "PixelStreamingExtCameraMode.h"
#include "IPixelStreamingModule.h"
#include "IPixelStreamingStreamer.h"
#include "SceneCaptureActorComponent.generated.h"

class FStreamerExt;
class FPixelStreamingExtVideoInput;

UCLASS( ClassGroup=(Custom), meta=(BlueprintSpawnableComponent) )
class PIXELSTREAMINGEXT_API USceneCaptureActorComponent : public UActorComponent
{
	GENERATED_BODY()

public:	
	// Sets default values for this component's properties
	USceneCaptureActorComponent();

protected:
	// Called when the game starts
	virtual void BeginPlay() override;
	virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

public:
	UFUNCTION(Category = "PixelStreamingExt", BlueprintCallable, meta = (DisplayName = "ConnectSignalling", Keywords = "Connect"))
	void ConnectSignalling();

	UFUNCTION(Category = "PixelStreamingExt", BlueprintCallable, meta = (DisplayName = "DisconnectSignalling", Keywords = "Disconnect"))
	void DisconnectSignalling();

	UFUNCTION(Category = "PixelStreamingExt", BlueprintCallable, meta = (DisplayName = "StartStreaming", Keywords = "Start"))
	void StartStreaming();

	UFUNCTION(Category = "PixelStreamingExt", BlueprintCallable, meta = (DisplayName = "StopStreaming", Keywords = "Stop"))
	void StopStreaming();

	UFUNCTION(Category = "PixelStreamingExt", BlueprintCallable, meta = (DisplayName = "DeprojectToWorld", Keywords = "Deproject"))
	bool DeprojectToWorld(const FVector2D& TargetXY, FVector& WorldPosition, FVector& WorldDirection);

	UFUNCTION(Category = "PixelStreamingExt", BlueprintCallable, meta = (DisplayName = "ResetTargetScreenRect", Keywords = "ScreenRect"))
	void ResetTargetScreenRect();

public:
	UPROPERTY(Category = "PixelStreamingExt SceneCapture", EditAnywhere, BlueprintReadWrite)
	PSExtCameraMode CameraMode;

	UPROPERTY(Category = "PixelStreamingExt SceneCapture", EditAnywhere, BlueprintReadWrite)
	bool IsDisplay = true;

	UPROPERTY(Category = "PixelStreamingExt SceneCapture", EditAnywhere, BlueprintReadWrite)
	FString SceneId;

	UPROPERTY(Category = "PixelStreamingExt SceneCapture", EditAnywhere, BlueprintReadWrite)
	FString PlayerId;

	UPROPERTY(Category = "PixelStreamingExt SceneCapture", EditAnywhere)
	FComponentReference SceneCapture;

public:
	TSharedPtr<FStreamerExt> StreamerExt;

private:
	bool CheckParameters();

private:
	TSharedPtr<FPixelStreamingExtVideoInput> VideoInput = nullptr;
};
