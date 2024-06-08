#include "PixelStreamingExtAsyncAction.h"
#include "Engine/World.h"
#include "PixelStreamingExtDelegates.h"
#include "StreamerExt.h"

DEFINE_LOG_CATEGORY_STATIC(LogPixelStreamingExtAsync, Log, All);

FStartStreamingAsync::FStartStreamingAsync()
{
}

FStartStreamingAsync::~FStartStreamingAsync() 
{
	Remove();
}

void FStartStreamingAsync::Start()
{
	if (SceneCapture)
	{
		// Streamer が準備されていない場合には、ここで接続処理をおこないます。
		if (!SceneCapture->StreamerExt.IsValid() || !SceneCapture->StreamerExt->Streamer.IsValid())
		{
			SceneCapture->ConnectSignalling();
		}

		if (SceneCapture->StreamerExt.IsValid() && SceneCapture->StreamerExt->Streamer.IsValid()) {
			StreamingStartedHandle = SceneCapture->StreamerExt->Streamer->OnStreamingCompleted().AddRaw(this, &FStartStreamingAsync::OnStreamingCompleted);
			SceneCapture->StartStreaming();
		} else {
			UE_LOG(LogPixelStreamingExtAsync, Warning, TEXT("Failed access SceneCapture streamer."));
			Action->OnStreamingStarted();
		}
	}
}

void FStartStreamingAsync::OnStreamingCompleted(IPixelStreamingStreamer *InStreamer)
{
	Action->OnStreamingStarted();
	Remove();
}

void FStartStreamingAsync::Remove()
{
	if (StreamingStartedHandle.IsValid() && SceneCapture && SceneCapture->StreamerExt.IsValid() && SceneCapture->StreamerExt->Streamer.IsValid())
	{
		SceneCapture->StreamerExt->Streamer->OnStreamingCompleted().Remove(StreamingStartedHandle);
	}
}

////////////////////////////////////////////////////////////////////////////////

UStartStreamingAsyncAction* UStartStreamingAsyncAction::StartStreamingAsync(const UObject* WorldContextObject, USceneCaptureActorComponent *InSceneCapture)
{
	UStartStreamingAsyncAction* Action = NewObject<UStartStreamingAsyncAction>();
	Action->Async.SceneCapture = InSceneCapture;
	Action->Async.Action = Action;
	// GC 対象にならないように GameInstance に登録する
	Action->RegisterWithGameInstance(WorldContextObject);
	return Action;
}

void UStartStreamingAsyncAction::Activate()
{
	Async.Start();
}

void UStartStreamingAsyncAction::OnStreamingStarted()
{
	// ノードを終了したことを通知する
	Completed.Broadcast();
	// 終わったので登録を解除しGC対象に設定する
	SetReadyToDestroy();
}

////////////////////////////////////////////////////////////////////////////////

FConnectingSignallingServerAsync::FConnectingSignallingServerAsync()
{
}

FConnectingSignallingServerAsync::~FConnectingSignallingServerAsync()
{
	Remove();
}

void FConnectingSignallingServerAsync::Start()
{
	if (SceneCapture)
	{
		SceneCapture->ConnectSignalling();
		if (SceneCapture->StreamerExt.IsValid() && SceneCapture->StreamerExt->Streamer.IsValid())
		{
			ConnectingSignallingHandle = SceneCapture->StreamerExt->Streamer->OnStreamingStarted().AddRaw(this, &FConnectingSignallingServerAsync::OnSignallingServerConnected);
		}
	}
}

void FConnectingSignallingServerAsync::OnSignallingServerConnected(IPixelStreamingStreamer *InStreamer)
{
	Action->OnSignallingServerConnected();
	Remove();
}

void FConnectingSignallingServerAsync::Remove()
{
	if (ConnectingSignallingHandle.IsValid() && SceneCapture && SceneCapture->StreamerExt.IsValid() && SceneCapture->StreamerExt->Streamer.IsValid())
	{
		SceneCapture->StreamerExt->Streamer->OnStreamingStarted().Remove(ConnectingSignallingHandle);
	}
}


UConnectingSignallingServerAsyncAction* UConnectingSignallingServerAsyncAction::ConnectToSignallingServerAsync(const UObject* WorldContextObject, USceneCaptureActorComponent *InSceneCapture)
{
	UConnectingSignallingServerAsyncAction *Action = NewObject<UConnectingSignallingServerAsyncAction>();
	Action->Async.SceneCapture = InSceneCapture;
	Action->Async.Action = Action;
	// GC 対象にならないように GameInstance に登録する
	Action->RegisterWithGameInstance(WorldContextObject);
	return Action;
}

void UConnectingSignallingServerAsyncAction::Activate()
{
	Async.Start();
}

void UConnectingSignallingServerAsyncAction::OnSignallingServerConnected()
{
	// ノードを終了したことを通知する
	Completed.Broadcast();
	// 終わったので登録を解除しGC対象に設定する
	SetReadyToDestroy();
}
