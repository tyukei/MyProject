// Copyright Epic Games, Inc. All Rights Reserved.
#pragma once

#include "Components/ActorComponent.h"
#include "IPixelStreamingModule.h"
#include "PixelStreamingExtModule.h"
#include "PixelStreamingExtInputComponent.generated.h"

/**
 * This component may be attached to an actor to allow UI interactions to be
 * handled as the delegate will be notified about the interaction and will be
 * supplied with a generic descriptor string containing, for example, JSON data.
 * Responses back to the source of the UI interactions may also be sent.
 */
UCLASS(Blueprintable, ClassGroup = (PixelStreaming), meta = (BlueprintSpawnableComponent))
class PIXELSTREAMINGEXT_API UPixelStreamingExtInput : public UActorComponent
{
	GENERATED_BODY()

public:
	UPixelStreamingExtInput(const FObjectInitializer& ObjectInitializer);

	void BeginPlay() override;
	void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

	// The delegate which will be notified about a UI interaction.
	DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnInput, const FString&, PlayerId, const FString&, Descriptor);
	UPROPERTY(BlueprintAssignable, Category = "PixelStreamingExt Input")
	FOnInput OnInputEvent;

	/**
	 * Send a response back to the source of the UI interactions.
	 * @param Descriptor - A generic descriptor string.
	 */
	UFUNCTION(BlueprintCallable, Category = "PixelStreamingExt Input")
	void SendPixelStreamingResponse(const FString& Descriptor);
};
