// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Framework/Commands/Commands.h"
#include "PixelStreamingExtEditorStyle.h"

class FPixelStreamingExtEditorCommands : public TCommands<FPixelStreamingExtEditorCommands>
{
public:

	FPixelStreamingExtEditorCommands()
		: TCommands<FPixelStreamingExtEditorCommands>(TEXT("PixelStreamingExtEditor"), NSLOCTEXT("Contexts", "PixelStreamingExtEditor", "PixelStreamingExtEditor Plugin"), NAME_None, FPixelStreamingExtEditorStyle::GetStyleSetName())
	{
	}

	// TCommands<> interface
	virtual void RegisterCommands() override;

public:
	TSharedPtr<FUICommandInfo> PluginAction;
	TSharedPtr<FUICommandInfo> StartSignalling;
	TSharedPtr<FUICommandInfo> StopSignalling;
	TSharedPtr<FUICommandInfo> DeleteSignallingAction;
};
