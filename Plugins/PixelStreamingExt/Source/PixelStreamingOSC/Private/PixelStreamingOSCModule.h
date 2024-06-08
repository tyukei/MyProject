// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "Modules/ModuleManager.h"
#include "IPixelStreamingOSCModule.h"
#include "OSCSender.h"

class PIXELSTREAMINGOSC_API FPixelStreamingOSCModule : public IPixelStreamingOSCModule
{
public:
	virtual void SetOSCComponent(UPixelStreamingOSC* InOSCComponent) override;
	virtual const UPixelStreamingOSC* GetOSCComponent() override;
	virtual void DispatchOSCMessage(FOSCMessage& Message) override;
	virtual void DispatchOSCBundle(FOSCBundle& Bundle) override;

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;

	void AddOSCDestination(const FString& IPAddress, uint16 Port);
	void ClearOSCDestination();

private:
	UPixelStreamingOSC* OSCComponent;
	FOSCSender OSCSender;
	FCriticalSection Lock;
};
