// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtModule.h"
#include "PixelStreamingExtDelegates.h"
#include "PixelStreamingExtPlayerDelegates.h"
#include "PixelStreamingInputProtocol.h"
#include "PixelStreamingInputProtocolMap.h"
#include "PixelStreamingExtPlayerManager.h"
#include "PixelStreamingExtCameraMode.h"
#include "StreamerExt.h"
#if WITH_EDITOR
#include "PixelStreamingExtEditorSettings.h"
#include "ISettingsModule.h"
#endif

#define LOCTEXT_NAMESPACE "FPixelStreamingExtModule"

void FPixelStreamingExtModule::StartupModule()
{
	// Pixel Streaming does not make sense without an RHI so we don't run in commandlets without one.
	if (IsRunningCommandlet() && !IsAllowCommandletRendering())
	{
		return;
	}

	if (!FSlateApplication::IsInitialized())
	{
		return;
	}

#if WITH_EDITOR
	// register settings
	ISettingsModule* SettingsModule = FModuleManager::GetModulePtr<ISettingsModule>("Settings");

	if (SettingsModule != nullptr)	
	{
		SettingsModule->RegisterSettings("Project", "Plugins", "PixelStreamingExt",
			LOCTEXT("PixelStreamingExtSettingsName", "PixelStreamingExt"),
			LOCTEXT("PixelStreamingExtSettingsDescription", "Project settings for PixelStreamingExt plugin"),
			GetMutableDefault<UPixelStreamingExtEditorSettings>()
		);
	}
#endif

	//// This code will execute after your module is loaded into memory; the exact timing is specified in the .uplugin file per-module
	UGameViewportClient::OnViewportCreated().AddRaw(this, &FPixelStreamingExtModule::OnViewportCreatedHandler);

	PlayerManager = TSharedPtr<FPixelStreamingPlayerManager>(new FPixelStreamingPlayerManager());

	// PixelStreaming からのイベントを受け取るためのデリゲートを設定します。
	if (UPixelStreamingDelegates* Delegates = UPixelStreamingDelegates::GetPixelStreamingDelegates())
	{
		OnPlayerConnectedHandle = Delegates->OnPlayerConnectedNative.AddRaw(this, &FPixelStreamingExtModule::OnPlayerConnected);
		OnPlayerDisconnectedHandle = Delegates->OnPlayerDisconnectedNative.AddRaw(this, &FPixelStreamingExtModule::OnPlayerDisconnected);
		OnPlayerGoingAwayHandle = Delegates->OnPlayerGoingAwayNative.AddRaw(this, &FPixelStreamingExtModule::OnPlayerGoingAway);
		OnDataChannelOpenHandle = Delegates->OnDataChannelOpenNative.AddRaw(this, &FPixelStreamingExtModule::OnDataChannelOpen);
		OnDataChannelClosedHandle = Delegates->OnDataChannelClosedNative.AddRaw(this, &FPixelStreamingExtModule::OnDataChannelClosed);
	}

	if (UPixelStreamingExtDelegates* Delegates = UPixelStreamingExtDelegates::GetPixelStreamingExtDelegates())
	{
		OnCameraSelectRequestHandle = Delegates->OnCameraSelectRequestNative.AddRaw(this, &FPixelStreamingExtModule::OnCameraSelectRequest);
	}

	// Web クライアントと PixelStreaming 拡張プラグインでやり取りを行うたのイベントタイプを定義します。

	// enum class EToStreamerMsg : uint8
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("CameraSwitchResponse", FPixelStreamingInputMessage(101));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("CameraSetRes", FPixelStreamingInputMessage(105));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("UIInteraction", FPixelStreamingInputMessage(50));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("MouseDown", FPixelStreamingInputMessage(72));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("MouseUp", FPixelStreamingInputMessage(73));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("MouseMove", FPixelStreamingInputMessage(74));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("TouchStart", FPixelStreamingInputMessage(80));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("TouchEnd", FPixelStreamingInputMessage(81));
	FPixelStreamingInputProtocol::ToStreamerProtocol.Add("TouchMove", FPixelStreamingInputMessage(82));

	// enum class EToPlayerMsg : uint8
	FPixelStreamingInputProtocol::FromStreamerProtocol.Add("Custom", FPixelStreamingInputMessage(128));
	FPixelStreamingInputProtocol::FromStreamerProtocol.Add("CameraSwitchRequest", FPixelStreamingInputMessage(129));
}

void FPixelStreamingExtModule::ShutdownModule()
{
	// This function may be called during shutdown to clean up your module.  For modules that support dynamic reloading,
	// we call this function before unloading the module.

	PlayerManager = nullptr;
	ClearPixelStreamingExtPlayerDelegates();

#if WITH_EDITOR
	// unregister settings
	ISettingsModule* SettingsModule = FModuleManager::GetModulePtr<ISettingsModule>("Settings");

	if (SettingsModule != nullptr)
	{
		SettingsModule->UnregisterSettings("Project", "Plugins", "PixelStreamingExt");
	}
#endif

}

void FPixelStreamingExtModule::AddInputComponent(UPixelStreamingExtInput* InInputComponent)
{
	InputComponents.Add(InInputComponent);
}

void FPixelStreamingExtModule::RemoveInputComponent(UPixelStreamingExtInput* InInputComponent)
{
	InputComponents.Remove(InInputComponent);
}

const TArray<UPixelStreamingExtInput*> FPixelStreamingExtModule::GetInputComponents()
{
	return InputComponents;
}

void FPixelStreamingExtModule::OnViewportCreatedHandler()
{
	// Editor の場合にはコントローラーを追加しない。
	if (!GIsEditor)
	{
		// PlayerController用のマッピングを追加
		int32 MaxPlayerNum = GEngine->GameViewport->MaxSplitscreenPlayers;
		for (int i = 1; i < MaxPlayerNum; i++)
		{
			IPlatformInputDeviceMapper& DeviceManager = IPlatformInputDeviceMapper::Get();
			FPlatformUserId PlatformUser = PLATFORMUSERID_NONE;
			FInputDeviceId InputDevice = INPUTDEVICEID_NONE;
			DeviceManager.RemapControllerIdToPlatformUserAndDevice(i, PlatformUser, InputDevice);
			DeviceManager.Internal_MapInputDeviceToUser(InputDevice, PlatformUser, EInputDeviceConnectionState::Connected);
		}
	}
}

void FPixelStreamingExtModule::OnPlayerConnected(FString StreamerId, FPixelStreamingPlayerId PlayerId)
{
	TSharedPtr<FStreamerExt> Streamer = FindStreamer(StreamerId);
	if (!Streamer.IsValid())
	{
		// AI用の PixelStreaming は処理を行わないようにします。
		return;
	}

	// UE5.2 からは、FStreamer を複数持つために、同じ PlayerId が呼び出されてしまう。
	// ここで回避します。
	if (PlayerManager->Contains(PlayerId))
	{
		return;
	}
	PlayerManager->Add(PlayerId, TEXT(""));

	AsyncTask(ENamedThreads::GameThread, [this, PlayerId]() {
		if (UPixelStreamingExtDelegates* Delegates = UPixelStreamingExtDelegates::GetPixelStreamingExtDelegates())
		{
			Delegates->OnPlayerConnected.Broadcast(PlayerId);
		}
	});
}

void FPixelStreamingExtModule::OnPlayerDisconnected(FString StreamerId, FPixelStreamingPlayerId PlayerId)
{
	TSharedPtr<FStreamerExt> Streamer = FindStreamer(StreamerId);
	if (!Streamer.IsValid())
	{
		// AI用の PixelStreaming は処理を行わないようにします。
		return;
	}

	FString MetaCommId;
	if (!PlayerManager->Contains(PlayerId))
	{
		return;
	}
	MetaCommId = PlayerManager->GetMetaCommId(PlayerId);
	PlayerManager->Remove(PlayerId);

	AsyncTask(ENamedThreads::GameThread, [this, PlayerId, MetaCommId]() {
		if (UPixelStreamingExtDelegates* Delegates = UPixelStreamingExtDelegates::GetPixelStreamingExtDelegates())
		{
			Delegates->OnPlayerDisconnected.Broadcast(PlayerId, MetaCommId);
		}
	});
}

void FPixelStreamingExtModule::OnPlayerGoingAway(FString StreamerId, FPixelStreamingPlayerId PlayerId)
{
	TSharedPtr<FStreamerExt> Streamer = FindStreamer(StreamerId);
	if (!Streamer.IsValid())
	{
		// AI用の PixelStreaming は処理を行わないようにします。
		return;
	}

	FString MetaCommId;
	if (!PlayerManager->Contains(PlayerId))
	{
		return;
	}
	MetaCommId = PlayerManager->GetMetaCommId(PlayerId);
	PlayerManager->Remove(PlayerId);

	AsyncTask(ENamedThreads::GameThread, [this, PlayerId, MetaCommId]() {
		if (UPixelStreamingExtDelegates* Delegates = UPixelStreamingExtDelegates::GetPixelStreamingExtDelegates())
		{
			Delegates->OnPlayerGoingAway.Broadcast(PlayerId, MetaCommId);
		}
	});
}

void FPixelStreamingExtModule::OnCameraSelectRequest(FString PlayerId, FString MetaCommId, FString SceneId)
{
	PlayerManager->Add(PlayerId, MetaCommId);
}

void FPixelStreamingExtModule::OnDataChannelOpen(FString StreamerId, FPixelStreamingPlayerId PlayerId, FPixelStreamingDataChannel* DataChannel)
{
}

void FPixelStreamingExtModule::OnDataChannelClosed(FString StreamerId, FPixelStreamingPlayerId PlayerId)
{
}

int32 FPixelStreamingExtModule::GetPlayerCount()
{
	return PlayerManager->GetPlayerCount();
}

FString FPixelStreamingExtModule::GetMetaCommId(FPixelStreamingPlayerId InPlayerId)
{
	return PlayerManager->GetMetaCommId(InPlayerId);
}

FString FPixelStreamingExtModule::GetPlayerId(FString InMetaCommId)
{
	return PlayerManager->GetPlayerId(InMetaCommId);
}

UPixelStreamingExtPlayerDelegates* FPixelStreamingExtModule::GetPixelStreamingExtPlayerDelegates(FPixelStreamingPlayerId InPlayerId)
{
	if (PlayerDelegatesMap.Contains(InPlayerId))
	{
		return PlayerDelegatesMap[InPlayerId];
	}
	else
	{
		return CreatePixelStreamingExtPlayerDelegates(InPlayerId);
	}
}

UPixelStreamingExtPlayerDelegates* FPixelStreamingExtModule::CreatePixelStreamingExtPlayerDelegates(FPixelStreamingPlayerId InPlayerId)
{
	if (PlayerDelegatesMap.Contains(InPlayerId))
	{
		return PlayerDelegatesMap[InPlayerId];
	}
	else
	{
		UPixelStreamingExtPlayerDelegates* instance = NewObject<UPixelStreamingExtPlayerDelegates>();
		instance->AddToRoot();
		PlayerDelegatesMap.Add(InPlayerId, instance);
		return instance;
	}
}

bool FPixelStreamingExtModule::RemovePixelStreamingExtPlayerDelegates(FPixelStreamingPlayerId InPlayerId)
{
	if (PlayerDelegatesMap.Contains(InPlayerId))
	{
		return PlayerDelegatesMap.Remove(InPlayerId) != 0;
	}
	else
	{
		return false;
	}
}

void FPixelStreamingExtModule::ClearPixelStreamingExtPlayerDelegates()
{
	PlayerDelegatesMap.Empty();
}


TSharedPtr<FStreamerExt> FPixelStreamingExtModule::CreateStreamer(const FString& StreamerId, const FString& PlayerId, const FString& CameraMode)
{
	TSharedPtr<FStreamerExt> ExistingStreamer = FindStreamer(StreamerId);
	if (ExistingStreamer)
	{
		return ExistingStreamer;
	}

	TSharedPtr<FStreamerExt> NewStreamer = TSharedPtr<FStreamerExt>(new FStreamerExt(StreamerId, PlayerId, CameraMode));
	if (NewStreamer.IsValid())
	{
		NewStreamer->CreateStreamer();
		{
			FScopeLock Lock(&StreamersCS);
			Streamers.Add(StreamerId, NewStreamer);
		}
	}
	return NewStreamer;
}

TSharedPtr<FStreamerExt> FPixelStreamingExtModule::DeleteStreamer(const FString& StreamerId)
{
	TSharedPtr<FStreamerExt> ToBeDeleted;
	FScopeLock Lock(&StreamersCS);
	if (Streamers.Contains(StreamerId))
	{
		ToBeDeleted = Streamers[StreamerId].Pin();
		Streamers.Remove(StreamerId);
	}
	return ToBeDeleted;
}

TSharedPtr<FStreamerExt> FPixelStreamingExtModule::FindStreamer(const FString& StreamerId)
{
	FScopeLock Lock(&StreamersCS);
	if (Streamers.Contains(StreamerId))
	{
		return Streamers[StreamerId].Pin();
	}
	return nullptr;
}

void FPixelStreamingExtModule::ForEachStreamer(const TFunction<void(TSharedPtr<FStreamerExt>)>& Func)
{
	TSet<FString> KeySet;
	{
		FScopeLock Lock(&StreamersCS);
		Streamers.GetKeys(KeySet);
	}
	for (auto&& StreamerId : KeySet)
	{
		if (TSharedPtr<FStreamerExt> Streamer = FindStreamer(StreamerId))
		{
			Func(Streamer);
		}
	}
}

#undef LOCTEXT_NAMESPACE
	
IMPLEMENT_MODULE(FPixelStreamingExtModule, PixelStreamingExt)
