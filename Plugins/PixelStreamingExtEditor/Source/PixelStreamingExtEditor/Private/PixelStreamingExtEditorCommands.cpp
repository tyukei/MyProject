// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtEditorCommands.h"

#define LOCTEXT_NAMESPACE "FPixelStreamingExtEditorModule"

void FPixelStreamingExtEditorCommands::RegisterCommands()
{
	UI_COMMAND(PluginAction, "PixelStreamingExtEditor", "Execute PixelStreamingExtEditor action", EUserInterfaceActionType::Button, FInputChord());
	
	UI_COMMAND(StartSignalling, "Launch Signalling Server", "Launch a Signalling Server that will listen for connections on the ports specified above", EUserInterfaceActionType::Button, FInputChord());
	UI_COMMAND(StopSignalling, "Stop Signalling Server", "Stop Signalling Server", EUserInterfaceActionType::Button, FInputChord());

	UI_COMMAND(DeleteSignallingAction, "Delete Signalling Server", "Delete Signalling Server", EUserInterfaceActionType::Button, FInputChord());
}

#undef LOCTEXT_NAMESPACE
