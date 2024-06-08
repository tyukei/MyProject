// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Misc/CommandLine.h"

class PixelStreamingExtSettings
{
public:
	static bool CreateSignallingServerUrl(FString& OutSignallingServerURL);
	static bool GetSignallingServerUrl(FString& OutSignallingServerURL);
	static bool GetSignallingServerIP(FString& OutSignallingServerIP);
	static bool GetSignallingServerPort(uint16& OutSignallingServerPort);
	static bool GetCameraResolutionLimit(uint16& MaxX, uint16& MaxY, uint16& MinX, uint16& MinY);

	static bool CreateAISignallingServerUrl(FString& OutSignallingServerURL);
	static bool GetAISignallingServerUrl(FString& OutSignallingServerURL);
	static bool GetAISignallingServerIP(FString& OutSignallingServerIP);
	static bool GetAISignallingServerPort(uint16& OutSignallingServerPort);
	static FString GetDefaultAISignallingURL();
};