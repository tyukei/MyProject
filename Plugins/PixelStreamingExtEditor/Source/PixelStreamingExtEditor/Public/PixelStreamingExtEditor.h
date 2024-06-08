// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"
#include "PixelStreamingExtServers.h"

class FToolBarBuilder;
class FMenuBuilder;

class FPixelStreamingExtEditorModule : public IModuleInterface
{
public:

	/** IModuleInterface implementation */
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
	
	/** This function will be bound to Command. */
	void StartSignallingButtonClicked();
	void StopSignallingButtonClicked();
	void DeleteSignallingButtonClicked();

	bool IsStartedServers();

private:

	void RegisterMenus();

	void RegisterEmbeddedSignallingServerConfig(FMenuBuilder& MenuBuilder);

	bool StartServers();
	void StopServers();

	bool StartSignallingServer();
	bool StartSFUServer();
	bool StartFrontEndServer();

private:
	TSharedPtr<class FUICommandList> PluginCommands;
	TSharedPtr<IServer> SignallingServer;
	TSharedPtr<IServer> SFUServer;
	TSharedPtr<IServer> FrontEndServer;
	TSharedPtr<FMonitoredProcess> DownloadProcess;
	TSharedPtr<FMonitoredProcess> DeleteProcess;

	int32 MaxPlayerControllers = 50;
	int32 WorkerNum = 1;
	int32 SSPort = 8888;
	int32 SFUPort = 8889;
	int32 HttpPort = 80;
	int32 ClientPort = 3000;
	TSharedPtr<FText> SelectedCameraMode;
	TArray<TSharedPtr<FText>> CameraModeOptions;
};
