// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "Modules/ModuleManager.h"
#include "PixelStreamingOSCComponent.h"
#include "OSCClient.h"

class PIXELSTREAMINGOSC_API IPixelStreamingOSCModule : public IModuleInterface
{
public:
	virtual void SetOSCComponent(UPixelStreamingOSC* InOSCComponent) = 0;
	virtual const UPixelStreamingOSC* GetOSCComponent() = 0;
	virtual void DispatchOSCMessage(FOSCMessage& Message) = 0;
	virtual void DispatchOSCBundle(FOSCBundle& Bundle) = 0;

	/** IModuleInterface implementation */
	virtual void StartupModule() = 0;
	virtual void ShutdownModule() = 0;
};
