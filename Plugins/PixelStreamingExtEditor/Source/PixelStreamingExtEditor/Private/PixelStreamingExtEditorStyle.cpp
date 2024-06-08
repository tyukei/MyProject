// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtEditorStyle.h"
#include "PixelStreamingExtEditor.h"
#include "Framework/Application/SlateApplication.h"
#include "Styling/SlateStyleRegistry.h"
#include "Slate/SlateGameResources.h"
#include "Interfaces/IPluginManager.h"
#include "Styling/SlateStyleMacros.h"

#define RootToContentDir Style->RootToContentDir

TSharedPtr<FSlateStyleSet> FPixelStreamingExtEditorStyle::StyleInstance = nullptr;

void FPixelStreamingExtEditorStyle::Initialize()
{
	if (!StyleInstance.IsValid())
	{
		StyleInstance = Create();
		FSlateStyleRegistry::RegisterSlateStyle(*StyleInstance);
	}
}

void FPixelStreamingExtEditorStyle::Shutdown()
{
	FSlateStyleRegistry::UnRegisterSlateStyle(*StyleInstance);
	ensure(StyleInstance.IsUnique());
	StyleInstance.Reset();
}

FName FPixelStreamingExtEditorStyle::GetStyleSetName()
{
	static FName StyleSetName(TEXT("PixelStreamingExtEditorStyle"));
	return StyleSetName;
}


const FVector2D Icon16x16(16.0f, 16.0f);

TSharedRef< FSlateStyleSet > FPixelStreamingExtEditorStyle::Create()
{
	TSharedRef< FSlateStyleSet > Style = MakeShareable(new FSlateStyleSet("PixelStreamingExtEditorStyle"));
	Style->SetContentRoot(IPluginManager::Get().FindPlugin("PixelStreamingExtEditor")->GetBaseDir() / TEXT("Resources"));

	Style->Set("PixelStreamingExt.Icon", new IMAGE_BRUSH_SVG(TEXT("PixelStreaming_16"), Icon16x16));
	return Style;
}

void FPixelStreamingExtEditorStyle::ReloadTextures()
{
	if (FSlateApplication::IsInitialized())
	{
		FSlateApplication::Get().GetRenderer()->ReloadTextureResources();
	}
}

const ISlateStyle& FPixelStreamingExtEditorStyle::Get()
{
	return *StyleInstance;
}
