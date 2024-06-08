// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtDelegates.h"

UPixelStreamingExtDelegates* UPixelStreamingExtDelegates::Singleton = nullptr;

UPixelStreamingExtDelegates* UPixelStreamingExtDelegates::CreateInstance()
{
	if (Singleton == nullptr)
	{
		Singleton = NewObject<UPixelStreamingExtDelegates>();
		Singleton->AddToRoot();
		return Singleton;
	}
	return Singleton;
}
