// Copyright Epic Games, Inc. All Rights Reserved.
#pragma once

#include "Components/ActorComponent.h"
#include "OSCClient.h"
#include "IPixelStreamingModule.h"
#include "PixelStreamingOSCComponent.generated.h"

UCLASS(Blueprintable, ClassGroup = (PixelStreaming), meta = (BlueprintSpawnableComponent))
class PIXELSTREAMINGOSC_API UPixelStreamingOSC : public UActorComponent
{
	GENERATED_BODY()

public:
	UPixelStreamingOSC(const FObjectInitializer& ObjectInitializer);

	void BeginPlay() override;
	void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	// 配信用 OSC クライアント
	UPROPERTY()
	UOSCClient* OSCClient;

private:
};
