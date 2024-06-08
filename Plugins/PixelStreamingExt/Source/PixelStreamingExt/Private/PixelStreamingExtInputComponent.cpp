// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtInputComponent.h"
#include "InputDevice.h"
#include "Engine/Engine.h"
#include "Engine/World.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "GameFramework/GameUserSettings.h"

UPixelStreamingExtInput::UPixelStreamingExtInput(const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UPixelStreamingExtInput::BeginPlay()
{
	Super::BeginPlay();

	// コンストラクタで IPixelStreamingModule を取得しようとすると落ちてしまうので、
	// ここで初期化するように修正
	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	Module.AddInputComponent(this);
}

void UPixelStreamingExtInput::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);

	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	Module.RemoveInputComponent(this);
}

void UPixelStreamingExtInput::SendPixelStreamingResponse(const FString& Descriptor)
{
	IPixelStreamingModule& Module = FModuleManager::LoadModuleChecked<IPixelStreamingModule>("PixelStreaming");
	Module.ForEachStreamer([&Descriptor, this](TSharedPtr<IPixelStreamingStreamer> Streamer) {
		Streamer->SendPlayerMessage(FPixelStreamingInputProtocol::FromStreamerProtocol.Find("Response")->GetID(), Descriptor);
	});
}

