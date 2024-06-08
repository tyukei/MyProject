// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingOSCModule.h"

#define LOCTEXT_NAMESPACE "FPixelStreamingOSCModule"

void FPixelStreamingOSCModule::StartupModule()
{
}

void FPixelStreamingOSCModule::ShutdownModule()
{
}

void FPixelStreamingOSCModule::SetOSCComponent(UPixelStreamingOSC* InOSCComponent)
{
	OSCComponent = InOSCComponent;
}

const UPixelStreamingOSC* FPixelStreamingOSCModule::GetOSCComponent()
{
	return OSCComponent;
}

void FPixelStreamingOSCModule::DispatchOSCMessage(FOSCMessage& Message)
{
	FScopeLock lock(&Lock);

	if (!OSCSender.HasOSCClient())
	{
		if (OSCComponent)
		{
			OSCSender.SetOSCClient(OSCComponent->OSCClient);
		}
	}
	OSCSender.SendOSCMessage(Message);
}

void FPixelStreamingOSCModule::DispatchOSCBundle(FOSCBundle& Bundle)
{
	FScopeLock lock(&Lock);

	if (!OSCSender.HasOSCClient())
	{
		if (OSCComponent)
		{
			OSCSender.SetOSCClient(OSCComponent->OSCClient);
		}
	}
	OSCSender.SendOSCBundle(Bundle);
}

void FPixelStreamingOSCModule::AddOSCDestination(const FString& IPAddress, uint16 Port)
{
	FScopeLock lock(&Lock);

	OSCSender.Add(IPAddress, Port);
}

void FPixelStreamingOSCModule::ClearOSCDestination()
{
	FScopeLock lock(&Lock);

	OSCSender.Clear();
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FPixelStreamingOSCModule, PixelStreamingOSC)