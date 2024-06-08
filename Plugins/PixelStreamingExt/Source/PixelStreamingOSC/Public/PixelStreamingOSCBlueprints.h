// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "PixelStreamingOSCBlueprints.generated.h"

UCLASS()
class PIXELSTREAMINGOSC_API UPixelStreamingOSCBlueprints : public UBlueprintFunctionLibrary
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Add OSC Destination"), Category = "PixelStreamingOSC")
	static void PixelStreamingExtAddDestination(const FString& IPAddress, int Port);

	UFUNCTION(BlueprintCallable, meta = (DisplayName = "Clear OSC Destination"), Category = "PixelStreamingOSC")
	static void PixelStreamingExtClearDestination();
};
