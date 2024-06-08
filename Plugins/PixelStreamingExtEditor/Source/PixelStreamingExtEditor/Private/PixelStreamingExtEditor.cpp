// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtEditor.h"
#include "PixelStreamingExtEditorStyle.h"
#include "PixelStreamingExtEditorCommands.h"
#include "Misc/MessageDialog.h"
#include "Misc/Paths.h"
#include "ToolMenus.h"
#include "SlateFwd.h"
#include "Widgets/Input/SNumericEntryBox.h"

static const FName PixelStreamingExtEditorTabName("PixelStreamingExtEditor");

#define LOCTEXT_NAMESPACE "FPixelStreamingExtEditorModule"

void FPixelStreamingExtEditorModule::StartupModule()
{
	// This code will execute after your module is loaded into memory; the exact timing is specified in the .uplugin file per-module
	FPixelStreamingExtEditorStyle::Initialize();
	FPixelStreamingExtEditorStyle::ReloadTextures();

	FPixelStreamingExtEditorCommands::Register();
	
	PluginCommands = MakeShareable(new FUICommandList);

	PluginCommands->MapAction(
		FPixelStreamingExtEditorCommands::Get().StartSignalling,
		FExecuteAction::CreateRaw(this, &FPixelStreamingExtEditorModule::StartSignallingButtonClicked),
		FCanExecuteAction());

	PluginCommands->MapAction(
		FPixelStreamingExtEditorCommands::Get().StopSignalling,
		FExecuteAction::CreateRaw(this, &FPixelStreamingExtEditorModule::StopSignallingButtonClicked),
		FCanExecuteAction());

	PluginCommands->MapAction(
		FPixelStreamingExtEditorCommands::Get().DeleteSignallingAction,
		FExecuteAction::CreateRaw(this, &FPixelStreamingExtEditorModule::DeleteSignallingButtonClicked),
		FCanExecuteAction());

	UToolMenus::RegisterStartupCallback(FSimpleMulticastDelegate::FDelegate::CreateRaw(this, &FPixelStreamingExtEditorModule::RegisterMenus));
}

void FPixelStreamingExtEditorModule::ShutdownModule()
{
	// This function may be called during shutdown to clean up your module.  For modules that support dynamic reloading,
	// we call this function before unloading the module.

	UToolMenus::UnRegisterStartupCallback(this);
	UToolMenus::UnregisterOwner(this);

	FPixelStreamingExtEditorStyle::Shutdown();
	FPixelStreamingExtEditorCommands::Unregister();
}

bool FPixelStreamingExtEditorModule::IsStartedServers()
{
	return (SignallingServer && SignallingServer->HasLaunched()) ||
		(SFUServer && SFUServer->HasLaunched()) ||
		(FrontEndServer && FrontEndServer->HasLaunched());
}

void FPixelStreamingExtEditorModule::StartSignallingButtonClicked()
{
	if (IsStartedServers())
	{
		// 起動中は何もしない
		return;
	}

	if (DeleteProcess.IsValid())
	{
		// 削除中はダウンロードさせないようにします。
		return;
	}

	if (!DownloadProcess.IsValid())
	{
		DownloadProcess = FPixelStreamingExtServers::DownloadPixelStreamingServers();
		if (DownloadProcess.IsValid())
		{
			DownloadProcess->OnCompleted().BindLambda([this](int ExitCode) {
				if (ExitCode != 0) {
					const FText MessageText = LOCTEXT("Message", "初期化に失敗しました。");
					const FText TitleText = LOCTEXT("Title", "Launch Signalling Server");
					FMessageDialog::Open(EAppMsgType::Ok, MessageText, &TitleText);

					if (!DeleteProcess.IsValid())
					{
						DeleteProcess = FPixelStreamingExtServers::DeletePixelStreamingServers();
						if (DeleteProcess.IsValid())
						{
							DeleteProcess->OnCompleted().BindLambda([this](int ExitCode) {
								DeleteProcess = nullptr;
							});
						}
					}
				} else {
					if (!StartServers()) {
						StopServers();
					}
				}
				DownloadProcess = nullptr;
			});
		}
	}
}

void FPixelStreamingExtEditorModule::StopSignallingButtonClicked()
{
	if (IsStartedServers())
	{
		StopServers();
	}
}

void FPixelStreamingExtEditorModule::DeleteSignallingButtonClicked()
{
	if (DownloadProcess.IsValid())
	{
		// ダウンロード中は削除させないようにします。
		return;
	}

	if (IsStartedServers())
	{
		// 実行中は削除させないようにします。
		return;
	}

	if (!DeleteProcess.IsValid())
	{
		const FText MessageText = LOCTEXT("Message", "サーバのファイルを削除しても良いでしょうか？");
		const FText TitleText = LOCTEXT("Title", "Delete Signalling Server");
		if (FMessageDialog::Open(EAppMsgType::YesNo, MessageText, &TitleText) == EAppReturnType::Yes)
		{
			DeleteProcess = FPixelStreamingExtServers::DeletePixelStreamingServers();
			if (DeleteProcess.IsValid())
			{
				DeleteProcess->OnCompleted().BindLambda([this](int ExitCode) {
					DeleteProcess = nullptr;
				});
			}
		}
	}
}

bool FPixelStreamingExtEditorModule::StartServers()
{
	if (!StartSignallingServer()) {
		return false;
	}
	
	if (!StartSFUServer()) {
		return false;
	}

	if (!StartFrontEndServer()) {
		return false;
	}
	
	return true;
}

void FPixelStreamingExtEditorModule::StopServers()
{
	if (SignallingServer) {
		SignallingServer->Stop();
		SignallingServer = nullptr;
	}

	if (SFUServer) {
		SFUServer->Stop();
		SFUServer = nullptr;
	}

	if (FrontEndServer) {
		FrontEndServer->Stop();
		FrontEndServer = nullptr;
	}
}

bool FPixelStreamingExtEditorModule::StartSignallingServer()
{
	SignallingServer = FPixelStreamingExtServers::MakeCirrusServer();

	FLaunchArgs LaunchArgs;
	LaunchArgs.bPollUntilReady = false;
	LaunchArgs.ReconnectionTimeoutSeconds = 30.0f;
	LaunchArgs.ReconnectionIntervalSeconds = 2.0f;
	LaunchArgs.ProcessArgs = FString::Printf(TEXT("--HttpPort=%d "
																								"--StreamerPort=%d "
																								"--SFUPort=%d "
																								"--maxPlayerControllers=%d"), 
																								HttpPort, SSPort, SFUPort, MaxPlayerControllers);
	return SignallingServer->Launch(LaunchArgs);
}

bool FPixelStreamingExtEditorModule::StartSFUServer()
{
	SFUServer = FPixelStreamingExtServers::MakeSFUServer();

	FLaunchArgs LaunchArgs;
	LaunchArgs.bPollUntilReady = false;
	LaunchArgs.ReconnectionTimeoutSeconds = 30.0f;
	LaunchArgs.ReconnectionIntervalSeconds = 2.0f;
	LaunchArgs.ProcessArgs = FString::Printf(TEXT("--SignallingURL=ws://localhost:%d --workerNum=%d"), SFUPort, WorkerNum);

	return SFUServer->Launch(LaunchArgs);
}

bool FPixelStreamingExtEditorModule::StartFrontEndServer()
{
	FrontEndServer = FPixelStreamingExtServers::MakeFrontEndServer();

	FLaunchArgs LaunchArgs;
	LaunchArgs.bPollUntilReady = false;
	LaunchArgs.ReconnectionTimeoutSeconds = 30.0f;
	LaunchArgs.ReconnectionIntervalSeconds = 2.0f;
	LaunchArgs.ProcessArgs = FString::Printf(TEXT("localhost:%d %d"), HttpPort, ClientPort);

	return FrontEndServer->Launch(LaunchArgs);
}

void FPixelStreamingExtEditorModule::RegisterMenus()
{
	// Owner will be used for cleanup in call to UToolMenus::UnregisterOwner
	FToolMenuOwnerScoped OwnerScoped(this);

	{
		UToolMenu* Menu = UToolMenus::Get()->ExtendMenu("LevelEditor.MainMenu.Window");
		{
			FToolMenuSection& Section = Menu->FindOrAddSection("WindowLayout");
			Section.AddMenuEntryWithCommandList(FPixelStreamingExtEditorCommands::Get().PluginAction, PluginCommands);
		}
	}

	{
		UToolMenu* ToolbarMenu = UToolMenus::Get()->ExtendMenu("LevelEditor.LevelEditorToolBar.PlayToolBar");
		{
			FToolMenuSection& Section = ToolbarMenu->AddSection("PixelStreamingExt");
			Section.AddSeparator("PixelStreamingExtSeperator");
			{
				// Settings dropdown
				FToolMenuEntry SettingsEntry = FToolMenuEntry::InitComboButton(
					"PixelStreamingExtMenus",
					FUIAction(),
					FOnGetContent::CreateLambda(
						[&]() {
							FMenuBuilder MenuBuilder(true, PluginCommands);

							RegisterEmbeddedSignallingServerConfig(MenuBuilder);

							return MenuBuilder.MakeWidget();
						}),
					FText::FromString(TEXT("PixelStreamingExt")),
					FText::FromString(TEXT("Configure PixelStreamingExt")),
					FSlateIcon(FPixelStreamingExtEditorStyle::GetStyleSetName(), "PixelStreamingExt.Icon"),
					false,
					"PixelStreamingExtMenu");
				SettingsEntry.StyleNameOverride = "CalloutToolbar";
				SettingsEntry.SetCommandList(PluginCommands);
				Section.AddEntry(SettingsEntry);
			}
		}
	}
}


void FPixelStreamingExtEditorModule::RegisterEmbeddedSignallingServerConfig(FMenuBuilder& MenuBuilder)
{
	MenuBuilder.BeginSection("Signalling Server Options", LOCTEXT("PixelStreamingExtEmbeddedSSOptions", "Signalling Server Options"));

	if (DownloadProcess.IsValid())
	{
		TSharedRef<SWidget> DownloadInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Initializing ... ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))];
			MenuBuilder.AddWidget(DownloadInputBlock, FText(), true);
	}
	else if (DeleteProcess.IsValid())
	{
		TSharedRef<SWidget> DownloadInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Deleting ... ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))];
			MenuBuilder.AddWidget(DownloadInputBlock, FText(), true);
	}
	else if (!IsStartedServers())
	{
		{	// 最大プレイヤー数を定義
			TSharedRef<SWidget> MaxPlayerControllersInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Max PlayerControllers: ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))]
				+ SHorizontalBox::Slot()
						.HAlign(HAlign_Fill)
						.Padding(FMargin(0.0f, 3.0f, 8.0f, 3.0f))
						[SNew(SNumericEntryBox<int32>)
								.MinValue(1)
								.Value_Lambda([this]() {
									return MaxPlayerControllers;
								})
								.OnValueChanged_Lambda([this](int32 InMaxPlayerControllers) {
									if (InMaxPlayerControllers > 0) {
										MaxPlayerControllers = InMaxPlayerControllers;
									}
								})
								.OnValueCommitted_Lambda([this](int32 InMaxPlayerControllers, ETextCommit::Type InCommitType) {
									if (InMaxPlayerControllers > 0) {
										MaxPlayerControllers = InMaxPlayerControllers;
									}
								})];
			MenuBuilder.AddWidget(MaxPlayerControllersInputBlock, FText(), true);
		}

		{	// SFU Worker 個数
			TSharedRef<SWidget> WorkerNumInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Worker Num: ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))]
				+ SHorizontalBox::Slot()
						.HAlign(HAlign_Fill)
						.Padding(FMargin(0.0f, 3.0f, 8.0f, 3.0f))
						[SNew(SNumericEntryBox<int32>)
								.MinValue(1)
								.Value_Lambda([this]() {
									return WorkerNum;
								})
								.OnValueChanged_Lambda([this](int32 InWorkerNum) {
									if (InWorkerNum > 0) {
										WorkerNum = InWorkerNum;
									}
								})
								.OnValueCommitted_Lambda([this](int32 InWorkerNum, ETextCommit::Type InCommitType) {
									if (InWorkerNum > 0) {
										WorkerNum = InWorkerNum;
									}
								})];
			MenuBuilder.AddWidget(WorkerNumInputBlock, FText(), true);
		}

		{	// Streamer Port
			TSharedRef<SWidget> SSPortInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Streamer Port: ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))]
				+ SHorizontalBox::Slot()
						.HAlign(HAlign_Fill)
						.Padding(FMargin(0.0f, 3.0f, 8.0f, 3.0f))
						[SNew(SNumericEntryBox<int32>)
								.MinValue(1)
								.MaxValue(65535)
								.Value_Lambda([this]() {
									return SSPort;
								})
								.OnValueChanged_Lambda([this](int32 InSSPort) {
									if (InSSPort > 0 && InSSPort <= 65535) {
										SSPort = InSSPort;
									}
								})
								.OnValueCommitted_Lambda([this](int32 InSSPort, ETextCommit::Type InCommitType) {
									if (InSSPort > 0 && InSSPort <= 65535) {
										SSPort = InSSPort;
									}
								})];
			MenuBuilder.AddWidget(SSPortInputBlock, FText(), true);
		}

		{	// SFU Port
			TSharedRef<SWidget> SFUPortInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("SFU Port: ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))]
				+ SHorizontalBox::Slot()
						.HAlign(HAlign_Fill)
						.Padding(FMargin(0.0f, 3.0f, 8.0f, 3.0f))
						[SNew(SNumericEntryBox<int32>)
								.MinValue(1)
								.MaxValue(65535)
								.Value_Lambda([this]() {
									return SFUPort;
								})
								.OnValueChanged_Lambda([this](int32 InSFUPort) {
									if (InSFUPort > 0 && InSFUPort <= 65535) {
										SFUPort = InSFUPort;
									}
								})
								.OnValueCommitted_Lambda([this](int32 InSFUPort, ETextCommit::Type InCommitType) {
									if (InSFUPort > 0 && InSFUPort <= 65535) {
										SFUPort = InSFUPort;
									}
								})];
			MenuBuilder.AddWidget(SFUPortInputBlock, FText(), true);
		}

		{	// Http Port
			TSharedRef<SWidget> HttpPortInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Signalling Port: ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))]
				+ SHorizontalBox::Slot()
						.HAlign(HAlign_Fill)
						.Padding(FMargin(0.0f, 3.0f, 8.0f, 3.0f))
						[SNew(SNumericEntryBox<int32>)
								.MinValue(1)
								.MaxValue(65535)
								.Value_Lambda([this]() {
									return HttpPort;
								})
								.OnValueChanged_Lambda([this](int32 InHttpPort) {
									if (InHttpPort > 0 && InHttpPort <= 65535) {
										HttpPort = InHttpPort;
									}
								})
								.OnValueCommitted_Lambda([this](int32 InHttpPort, ETextCommit::Type InCommitType) {
									if (InHttpPort > 0 && InHttpPort <= 65535) {
										HttpPort = InHttpPort;
									}
								})];
			MenuBuilder.AddWidget(HttpPortInputBlock, FText(), true);
		}

		{	// Client Port
			TSharedRef<SWidget> ClientPortInputBlock = SNew(SHorizontalBox)
				+ SHorizontalBox::Slot()
						.AutoWidth()
						.VAlign(VAlign_Center)
						.Padding(FMargin(26.0f, 3.0f, 8.0f, 3.0f))
							[SNew(STextBlock)
									.Text(FText::FromString(TEXT("Client Port: ")))
									.ColorAndOpacity(FSlateColor(FLinearColor(1.0f, 1.0f, 1.0f)))]
				+ SHorizontalBox::Slot()
						.HAlign(HAlign_Fill)
						.Padding(FMargin(0.0f, 3.0f, 8.0f, 3.0f))
						[SNew(SNumericEntryBox<int32>)
								.MinValue(1)
								.MaxValue(65535)
								.Value_Lambda([this]() {
									return ClientPort;
								})
								.OnValueChanged_Lambda([this](int32 InClientPort) {
									if (InClientPort > 0 && InClientPort <= 65535) {
										ClientPort = InClientPort;
									}
								})
								.OnValueCommitted_Lambda([this](int32 InClientPort, ETextCommit::Type InCommitType) {
									if (InClientPort > 0 && InClientPort <= 65535) {
										ClientPort = InClientPort;
									}
								})];
			MenuBuilder.AddWidget(ClientPortInputBlock, FText(), true);
		}

		MenuBuilder.AddMenuEntry(FPixelStreamingExtEditorCommands::Get().StartSignalling);
		MenuBuilder.AddMenuEntry(FPixelStreamingExtEditorCommands::Get().DeleteSignallingAction);
	}
	else
	{
		MenuBuilder.AddMenuEntry(FPixelStreamingExtEditorCommands::Get().StopSignalling);
	}
	MenuBuilder.EndSection();
}

#undef LOCTEXT_NAMESPACE

IMPLEMENT_MODULE(FPixelStreamingExtEditorModule, PixelStreamingExtEditor)
