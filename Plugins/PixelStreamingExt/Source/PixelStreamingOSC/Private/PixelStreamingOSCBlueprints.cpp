// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingOSCBlueprints.h"
#include "PixelStreamingOSCModule.h"

void UPixelStreamingOSCBlueprints::PixelStreamingExtAddDestination(const FString& IPAddress, int Port)
{
	FPixelStreamingOSCModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingOSCModule>("PixelStreamingOSC");
	Module.AddOSCDestination(IPAddress, Port);
}

void UPixelStreamingOSCBlueprints::PixelStreamingExtClearDestination()
{
	FPixelStreamingOSCModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingOSCModule>("PixelStreamingOSC");
	Module.ClearOSCDestination();
}
