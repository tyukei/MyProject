// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtBlueprints.h"
#include "PixelStreamingSceneId.h"
#include "PixelStreamingExtModule.h"
#include "IPixelStreamingOSCModule.h"
#include "StreamerExt.h"

UPixelStreamingExtDelegates* UPixelStreamingExtBlueprints::GetPixelStreamingExtDelegates()
{
	return UPixelStreamingExtDelegates::GetPixelStreamingExtDelegates();
}

void UPixelStreamingExtBlueprints::PixelStreamingExtSendMessage(const FString& PlayerId, uint8 Type, const FString& Message)
{
	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	Module.ForEachStreamer([PlayerId, Type, &Message](TSharedPtr<FStreamerExt> Streamer) {
		if (PlayerId.Equals(ToPlayerId(-1), ESearchCase::CaseSensitive))
		{
			Streamer->SendPlayerMessage(Type, Message);
		}
		else
		{
			Streamer->SendPlayerMessage(PlayerId, Type, Message);
		}
	});
}

void UPixelStreamingExtBlueprints::PixelStreamingExtSendCustomMessage(const FString& PlayerId, const FString& Message)
{
	// Web クライアント側とタイプを合わせる必要があります。
	// 定義は、PixelStreamingExtModule::StartModule で行っています。
	uint8 Type = FPixelStreamingInputProtocol::FromStreamerProtocol.Find("Custom")->GetID();
	PixelStreamingExtSendMessage(PlayerId, Type, Message);
}

void UPixelStreamingExtBlueprints::PixelStreamingExtSendCameraSwitchPrepareRequest(const FString& PlayerId, const FString& SceneId)
{
	// Web クライアント側とタイプを合わせる必要があります。
	// 定義は、PixelStreamingExtModule::StartModule で行っています。
	uint8 Type = FPixelStreamingInputProtocol::FromStreamerProtocol.Find("CameraSwitchRequest")->GetID();
	FString Message = FString::Printf(TEXT("{\"type\":\"cameraSwitchPrepareRequest\", \"data\":{\"sceneId\" : \"%s\"}}"), *SceneId);
	PixelStreamingExtSendMessage(PlayerId, Type, Message);
}

void UPixelStreamingExtBlueprints::PixelStreamingExtSendCameraSwitchRequest(const FString& PlayerId, const FString& SceneId)
{
	// Web クライアント側とタイプを合わせる必要があります。
	// 定義は、PixelStreamingExtModule::StartModule で行っています。
	uint8 Type = FPixelStreamingInputProtocol::FromStreamerProtocol.Find("CameraSwitchRequest")->GetID();
	FString Message = FString::Printf(TEXT("{\"type\":\"cameraSwitchRequest\", \"data\":{\"sceneId\" : \"%s\"}}"), *SceneId);
	PixelStreamingExtSendMessage(PlayerId, Type, Message);
}

void UPixelStreamingExtBlueprints::PixelStreamingExtSendCameraSwitchCancelRequest(const FString& PlayerId, const FString& SceneId)
{
	// Web クライアント側とタイプを合わせる必要があります。
	// 定義は、PixelStreamingExtModule::StartModule で行っています。
	uint8 Type = FPixelStreamingInputProtocol::FromStreamerProtocol.Find("CameraSwitchRequest")->GetID();
	FString Message = FString::Printf(TEXT("{\"type\":\"cameraSwitchCancelRequest\", \"data\":{\"sceneId\" : \"%s\"}}"), *SceneId);
	PixelStreamingExtSendMessage(PlayerId, Type, Message);
}

void UPixelStreamingExtBlueprints::PixelStreamingExtDispatchOSCMessage(UPARAM(ref)FOSCMessage& Message)
{
	FOSCMessage _Msg;
	TSharedPtr<IOSCPacket> pack = Message.GetPacket();
	_Msg.SetPacket(pack);
	TFunction< void() > _TaskFunc = [_Msg]
	{
		IPixelStreamingOSCModule& Module = FModuleManager::LoadModuleChecked<IPixelStreamingOSCModule>("PixelStreamingOSC");
		Module.DispatchOSCMessage(const_cast<FOSCMessage&>(_Msg));
	};
	ENamedThreads::Type _Thread = ENamedThreads::AnyBackgroundThreadNormalTask;
	FFunctionGraphTask::CreateAndDispatchWhenReady(_TaskFunc, TStatId(), nullptr, _Thread);
}

void UPixelStreamingExtBlueprints::PixelStreamingExtDispatchOSCBundle(UPARAM(ref)FOSCBundle& Bundle)
{
	FOSCBundle _Msg;
	TSharedPtr<IOSCPacket> pack = Bundle.GetPacket();
	_Msg.SetPacket(pack);
	TFunction< void() > _TaskFunc = [_Msg]
	{
		IPixelStreamingOSCModule& Module = FModuleManager::LoadModuleChecked<IPixelStreamingOSCModule>("PixelStreamingOSC");
		Module.DispatchOSCBundle(const_cast<FOSCBundle&>(_Msg));
	};
	ENamedThreads::Type _Thread = ENamedThreads::AnyBackgroundThreadNormalTask;
	FFunctionGraphTask::CreateAndDispatchWhenReady(_TaskFunc, TStatId(), nullptr, _Thread);
}


FString UPixelStreamingExtBlueprints::PixelStreamingExtGetPlayerId(const FString& MetaCommId)
{
	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	return Module.GetPlayerId(MetaCommId);
}

FString UPixelStreamingExtBlueprints::PixelStreamingExtGetMetaCommId(const FString& playerId)
{
	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	return Module.GetMetaCommId(playerId);
}

int32 UPixelStreamingExtBlueprints::PixelStreamingExtGetPlayerCount()
{
	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	return Module.GetPlayerCount();
}

UPixelStreamingExtPlayerDelegates* UPixelStreamingExtBlueprints::GetPixelStreamingExtPlayerDelegates(const FString& playerId)
{
	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	return Module.GetPixelStreamingExtPlayerDelegates(playerId);
}
