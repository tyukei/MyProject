// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "PixelStreamingExtEditorSettings.generated.h"

/**
* Implements the settings for the PixelStreamingExt plugin.
*/

UCLASS(Config = Engine, DefaultConfig)
class UPixelStreamingExtEditorSettings : public UObject
{
	GENERATED_UCLASS_BODY()

	// Export WebServers for packaged builds and quick launch
	UPROPERTY(EditAnywhere, config, Category = Packaging, Meta = (DisplayName = "Export WebServers"))
	bool bExportWebServers;

private:
	// UObject interface
	virtual void PostInitProperties() override;
};

#if UE_ENABLE_INCLUDE_ORDER_DEPRECATED_IN_5_2
#include "CoreMinimal.h"
#include "Engine/EngineTypes.h"
#endif
