// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingOSCComponent.h"
#include "PixelStreamingOSCModule.h"
#include "OSCManager.h"

UPixelStreamingOSC::UPixelStreamingOSC(const FObjectInitializer& ObjectInitializer)
	: Super(ObjectInitializer)
{
	bAutoActivate = true;
	PrimaryComponentTick.bCanEverTick = false;
	SetComponentTickEnabled(false);
}

void UPixelStreamingOSC::BeginPlay()
{
	Super::BeginPlay();

	FPixelStreamingOSCModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingOSCModule>("PixelStreamingOSC");
	FString OscServerIp = TEXT("127.0.0.1");
	uint16 OscServerPort = 9000;
	OSCClient = UOSCManager::CreateOSCClient(OscServerIp, OscServerPort, TEXT("PS-OSC-Client"));
	Module.SetOSCComponent(this);
}

void UPixelStreamingOSC::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);

	FPixelStreamingOSCModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingOSCModule>("PixelStreamingOSC");
	Module.SetOSCComponent(nullptr);
	OSCClient = nullptr;
}
