#include "StreamerExt.h"
#include "StreamerExtInputStructures.h"
#include "PixelStreamingExtDelegates.h"
#include "PixelStreamingExtInputComponent.h"
#include "PixelStreamingExtSettings.h"
#include "Engine/GameEngine.h"
#include "PixelStreaming/Public/PixelStreamingSignallingConnection.h"
#include "CoreMinimal.h"

DEFINE_LOG_CATEGORY_STATIC(LogPixelStreamingExtStreamer, Log, All);

// グループ定義
DECLARE_STATS_GROUP(TEXT("StreamerExt"), STATGROUP_StreamerExt, STATCAT_Advanced);
// 具体的な計測項目の定義
DECLARE_CYCLE_STAT(TEXT("StreamerExt::HandleOnTouchStarted"), STAT_StreamerExt_HandleOnTouchStarted, STATGROUP_StreamerExt);
DECLARE_CYCLE_STAT(TEXT("StreamerExt::HandleOnTouchMoved"), STAT_StreamerExt_HandleOnTouchMoved, STATGROUP_StreamerExt);
DECLARE_CYCLE_STAT(TEXT("StreamerExt::HandleOnTouchEnded"), STAT_StreamerExt_HandleOnTouchEnded, STATGROUP_StreamerExt);

FStreamerExt::FStreamerExt(const FString& StreamerId, const FString& PlayerId, const FString& CameraMode)
{
	StreamerInfo = MakeShared<PixelStreamingStreamerInfo>();
	StreamerInfo->StreamerId = StreamerId;
	StreamerInfo->PlayerId = PlayerId;
	StreamerInfo->CameraMode = CameraMode;

	ExtModule = FModuleManager::Get().LoadModulePtr<FPixelStreamingExtModule>("PixelStreamingExt");
	Delegates = UPixelStreamingExtDelegates::GetPixelStreamingExtDelegates();

	bUseMouseForTouch = false;
	if (GConfig->GetBool(TEXT("/Script/Engine.InputSettings"), TEXT("bUseMouseForTouch"), bUseMouseForTouch, GInputIni))
	{
		UE_LOG(LogTemp, Log, TEXT("****** bUseMouseForTouch = %d"), bUseMouseForTouch);
	}
}

FStreamerExt::~FStreamerExt()
{
	DestroyStreamer();
	StreamerInfo = nullptr;
	ExtModule = nullptr;
	Delegates = nullptr;
	TargetScreenRect = nullptr;
}

void FStreamerExt::CreateStreamer()
{
	if (!Streamer.IsValid())
	{
		IPixelStreamingModule& Module = FModuleManager::LoadModuleChecked<IPixelStreamingModule>("PixelStreaming");
		Streamer = Module.CreateStreamer(StreamerInfo->StreamerId);

		// SignallingConnectionにStreamerの情報を設定します。
		TSharedPtr<IPixelStreamingSignallingConnection> SignallingConnection = MakeShared<FPixelStreamingExtSignallingConnection>(Streamer->GetSignallingConnectionObserver().Pin(), StreamerInfo->StreamerId, StreamerInfo);
		SignallingConnection->SetAutoReconnect(true);
		Streamer->SetSignallingConnection(SignallingConnection);

		// シグナリングサーバの URL を生成します。
		FString SignallingServerURL;
		PixelStreamingExtSettings::CreateSignallingServerUrl(SignallingServerURL);
		Streamer->SetSignallingServerURL(SignallingServerURL);

		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("SignallingServerURL: %s"), *SignallingServerURL);

		// DataChannel のイベントを受信するための設定を行います。
		// イベントタイプの定義は、PixelStreamingExtModule::StartModule で行っています。
		TSharedPtr<IPixelStreamingInputHandler> InputHandler = Streamer->GetInputHandler().Pin();
		InputHandler->RegisterMessageHandler("UIInteraction", [this](FString PlayerId, FMemoryReader Ar) { HandleUIInteraction(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("CameraSwitchResponse", [this](FString PlayerId, FMemoryReader Ar) { HandleCameraSwitchResponse(Ar); });
		InputHandler->RegisterMessageHandler("CameraSetRes", [this](FString PlayerId, FMemoryReader Ar) { HandleCameraSetRes(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("MouseUp", [this](FString PlayerId, FMemoryReader Ar) { HandleOnMouseUp(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("MouseDown", [this](FString PlayerId, FMemoryReader Ar) { HandleOnMouseDown(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("MouseMove", [this](FString PlayerId, FMemoryReader Ar) { HandleOnMouseMove(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("TouchStart", [this](FString PlayerId, FMemoryReader Ar) { HandleOnTouchStarted(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("TouchMove", [this](FString PlayerId, FMemoryReader Ar) { HandleOnTouchMoved(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("TouchEnd", [this](FString PlayerId, FMemoryReader Ar) { HandleOnTouchEnded(PlayerId, Ar); });
		InputHandler->RegisterMessageHandler("ResetBroadcastTouchMoveList", [this](FString PlayerId, FMemoryReader Ar) { HandleResetBroadcastTouchMoveList(); });
		InputHandler->RegisterMessageHandler("BroadcastTouchMoveList", [this](FString PlayerId, FMemoryReader Ar) { HandleBroadcastTouchMoveList(); });

		Streamer->SetInputHandlerType(EPixelStreamingInputType::RouteToWidget);
	}
}

void FStreamerExt::DestroyStreamer()
{
	if (Streamer.IsValid())
	{
		// 停止します。
		Streamer->StopStreamingExt();
		Streamer->DisconnectToSignallingServer();
		Streamer = nullptr;

		// IPixelStreamingModule から削除します。
		IPixelStreamingModule& Module = FModuleManager::LoadModuleChecked<IPixelStreamingModule>("PixelStreaming");
		Module.DeleteStreamer(StreamerInfo->StreamerId);
	}
}

void FStreamerExt::SetVideoInput(TSharedPtr<FPixelStreamingVideoInput> Input)
{
	if (Streamer.IsValid())
	{
		Streamer->SetVideoInput(Input);
	}
}

void FStreamerExt::ConnectToSignallingServer()
{
	if (Streamer.IsValid())
	{
		if (Streamer->IsSignallingConnected())
		{
			// Streamer がシグナリングサーバと接続している場合には何もしない。
			UE_LOG(LogPixelStreamingExtStreamer, Log, TEXT("Already connected to signaling server."));
			return;
		}
		Streamer->ConnectToSignallingServer();
	}
	else
	{
		UE_LOG(LogPixelStreamingExtStreamer, Log, TEXT("FStreamer is not initialize."));
	}
}

void FStreamerExt::DisconnectToSignallingServer()
{
	if (Streamer.IsValid())
	{
		Streamer->DisconnectToSignallingServer();
	}
}

void FStreamerExt::StartStreaming()
{
	if (Streamer.IsValid())
	{
		if (Streamer->IsStreaming())
		{
			// 既にストリーミングが開始されている場合には何もしない。
			UE_LOG(LogPixelStreamingExtStreamer, Log, TEXT("Streaming has already started."));
			return;
		}
		Streamer->StartStreamingExt();
	}
}

void FStreamerExt::StopStreaming()
{
	if (Streamer.IsValid())
	{
		Streamer->StopStreamingExt();
	}
}

void FStreamerExt::SendPlayerMessage(uint8 Type, const FString& Descriptor)
{
	if (Streamer.IsValid())
	{
		Streamer->SendPlayerMessage(Type, Descriptor);
	}
}

void FStreamerExt::SendPlayerMessage(FPixelStreamingPlayerId PlayerId, uint8 Type, const FString& Descriptor)
{
	if (Streamer.IsValid())
	{
		Streamer->SendPlayerMessage(PlayerId, Type, Descriptor);
	}
}

void FStreamerExt::HandleUIInteraction(FString PlayerId, FMemoryReader Ar)
{
	FString Res;
	Res.GetCharArray().SetNumUninitialized(Ar.TotalSize() / 2 + 1);
	Ar.Serialize(Res.GetCharArray().GetData(), Ar.TotalSize());

	FString Descriptor = Res.Mid(1);

	FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
	TArray<UPixelStreamingExtInput*> InputComponents = Module.GetInputComponents();
	for (UPixelStreamingExtInput* InputComponent : InputComponents)
	{
		InputComponent->OnInputEvent.Broadcast(PlayerId, Descriptor);
	}
}

void FStreamerExt::HandleCameraSetRes(FString PlayerId, FMemoryReader Ar)
{
	FString Res;
	Res.GetCharArray().SetNumUninitialized(Ar.TotalSize() / 2 + 1);
	Ar.Serialize(Res.GetCharArray().GetData(), Ar.TotalSize());

	FString Descriptor = Res.Mid(1);

	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("CameraSetRes: %s"), *Descriptor);

	TSharedPtr<FJsonObject> JsonRootObject = MakeShareable(new FJsonObject());
	TSharedRef<TJsonReader<>> JsonReader = TJsonReaderFactory<>::Create(Descriptor);
	if (FJsonSerializer::Deserialize(JsonReader, JsonRootObject))
	{
		FString Type = JsonRootObject->GetStringField("type");
		if (Type.Equals("cameraSetRes"))
		{
			TSharedPtr<FJsonObject> Data = JsonRootObject->GetObjectField("data");
			uint32 Width = Data->GetIntegerField("width");
			uint32 Height = Data->GetIntegerField("height");
			FString Target = PlayerId;
			// 定点カメラに対応する時はJsonでSceneIDを送信してもらう。他人のカメラを操作できるのはどうかと思うので今は無効化。
			//if (Data->HasField("sceneId"))
			//{
			//	Target = Data->GetStringField("sceneId");
			//}
			for (const FWorldContext& WorldContext : GEngine->GetWorldContexts())
			{
				if (WorldContext.WorldType == EWorldType::Game || WorldContext.WorldType == EWorldType::PIE)
				{
					UWorld* World = WorldContext.World();
					if (World)
					{
						FString Command = FString::Printf(TEXT("PSExt.SetRes %d %d %s"), Width, Height, *Target);
						GEngine->Exec(World, *Command);
						//UE_LOG(LogTemp, Log, TEXT("CameraSetRes: %s"), *Command);
					}
				}
			}
		}
	}
}

void FStreamerExt::HandleCameraSwitchResponse(FMemoryReader Ar)
{
	FString Res;
	Res.GetCharArray().SetNumUninitialized(Ar.TotalSize() / 2 + 1);
	Ar.Serialize(Res.GetCharArray().GetData(), Ar.TotalSize());

	FString Descriptor = Res.Mid(1);

	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("CameraSwitchResponse: %s"), *Descriptor);
	ProcessCameraSwitchResponse(Descriptor);
}

void FStreamerExt::ProcessCameraSwitchResponse(const FString& InDescriptor)
{
	TSharedPtr<FJsonObject> JsonRootObject = MakeShareable(new FJsonObject());
	TSharedRef<TJsonReader<>> JsonReader = TJsonReaderFactory<>::Create(InDescriptor);
	if (FJsonSerializer::Deserialize(JsonReader, JsonRootObject))
	{
		FString Type = JsonRootObject->GetStringField("type");
		if (Type.Equals("cameraSwitchPrepareResponse"))
		{
			ProcessCameraSwitchPrepareResponse(JsonRootObject);
		}
		else if (Type.Equals("cameraSwitchResponse"))
		{
			ProcessCameraSwitchResponse(JsonRootObject);
		}
		else if (Type.Equals("cameraSwitchCancelResponse"))
		{
			ProcessCameraSwitchCancelResponse(JsonRootObject);
		}
		else if (Type.Equals("cameraSelectRequest"))
		{
			ProcessCameraSelectRequest(JsonRootObject);
		}
		else
		{
			UE_LOG(LogPixelStreamingExtStreamer, Warning, TEXT("Unknown type: %s."), *Type);
		}
	}
}

void FStreamerExt::ProcessCameraSwitchPrepareResponse(TSharedPtr<FJsonObject> JsonRootObject)
{
	TSharedPtr<FJsonObject> Data = JsonRootObject->GetObjectField("data");
	bool Result = Data->GetBoolField("result");
	FString PlayerId = Data->GetStringField("playerId");
	FString SceneIdData = Data->GetStringField("sceneId");

	if (Delegates)
	{
		AsyncTask(ENamedThreads::GameThread, [this, PlayerId, SceneIdData, Result]()
		{
			Delegates->OnCameraSwitchPrepareResponse.Broadcast(PlayerId, SceneIdData, Result);
		});
	}
}

void FStreamerExt::ProcessCameraSwitchResponse(TSharedPtr<FJsonObject> JsonRootObject)
{
	TSharedPtr<FJsonObject> Data = JsonRootObject->GetObjectField("data");
	bool Result = Data->GetBoolField("result");
	FString PlayerId = Data->GetStringField("playerId");
	FString SceneIdData = Data->GetStringField("sceneId");

	if (Delegates)
	{
		AsyncTask(ENamedThreads::GameThread, [this, PlayerId, SceneIdData, Result]()
		{
			Delegates->OnCameraSwitchResponse.Broadcast(PlayerId, SceneIdData, Result);
		});
	}
}

void FStreamerExt::ProcessCameraSwitchCancelResponse(TSharedPtr<FJsonObject> JsonRootObject)
{
	TSharedPtr<FJsonObject> Data = JsonRootObject->GetObjectField("data");
	bool Result = Data->GetBoolField("result");
	FString PlayerId = Data->GetStringField("playerId");
	FString SceneIdData = Data->GetStringField("sceneId");

	if (Delegates)
	{
		AsyncTask(ENamedThreads::GameThread, [this, PlayerId, SceneIdData, Result]()
		{
			Delegates->OnCameraSwitchCancelResponse.Broadcast(PlayerId, SceneIdData, Result);
		});
	}
}

void FStreamerExt::ProcessCameraSelectRequest(TSharedPtr<FJsonObject> JsonRootObject)
{
	TSharedPtr<FJsonObject> Data = JsonRootObject->GetObjectField("data");
	FString PlayerId = Data->GetStringField("playerId");
	FString SceneIdData = Data->GetStringField("sceneId");
	const FString MetaCommId = Data->GetStringField("metaCommId");

	if (Delegates)
	{
		AsyncTask(ENamedThreads::GameThread, [this, PlayerId, MetaCommId, SceneIdData]()
		{
			Delegates->OnCameraSelectRequest.Broadcast(PlayerId, MetaCommId, SceneIdData);
			Delegates->OnCameraSelectRequestNative.Broadcast(PlayerId, MetaCommId, SceneIdData);
		});
	}
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
void FStreamerExt::HandleOnMouseUp(FString PlayerId, FMemoryReader Ar)
{
	TPayloadThreeParam<uint8, uint16, uint16> Payload(Ar);
	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleOnMouseUp() PlayerId: %s, Payload Param2: %d Param3: %d"), *PlayerId, Payload.Param2, Payload.Param3);

	FVector2D Location = ConvertFromNormalizedScreenLocation(FVector2D(Payload.Param2 / uint16_MAX, Payload.Param3 / uint16_MAX));

	if (bUseMouseForTouch)
	{
		// bUseMouseForTouch フラグが有効になっているときは、
		// マウスイベントをタッチイベントとして処理を行います。
		const int32 TouchIndex = 0;
		float TouchForce = 0.0f;
		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("MOUSE_UP -> TOUCH_END: TouchIndex = %d; Pos = (%d, %d); CursorPos = (%d, %d)"), TouchIndex, Payload.Param2, Payload.Param3, static_cast<int>(Location.X), static_cast<int>(Location.Y));

		if (Delegates)
		{
			Delegates->OnTouchEndEvent.Broadcast(PlayerId, Location, TouchForce, TouchIndex);
		}

		if (ExtModule)
		{
			// Player 毎にイベントを配信します。
			if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
			{
				PlayerDelegates->OnTouchEndEvent.Broadcast(PlayerId, Location, TouchForce, TouchIndex);
			}
		}
	}
	else
	{
		EMouseButtons::Type Button = static_cast<EMouseButtons::Type>(Payload.Param1);
		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("MOUSE_UP: Button = %d, Pos = (%d, %d)"), Button, static_cast<int>(Location.X), static_cast<int>(Location.Y));
		if (Delegates)
		{
			Delegates->OnMouseUpEvent.Broadcast(PlayerId, Button, Location);
		}

		if (ExtModule)
		{
			// Player 毎にイベントを配信します。
			if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
			{
				PlayerDelegates->OnMouseUpEvent.Broadcast(PlayerId, Button, Location);
			}
		}
	}
}

void FStreamerExt::HandleOnMouseDown(FString PlayerId, FMemoryReader Ar)
{
	TPayloadThreeParam<uint8, uint16, uint16> Payload(Ar);
	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleOnMouseDown() PlayerId: %s, Payload Param2: %d Param3: %d"), *PlayerId, Payload.Param2, Payload.Param3);

	FVector2D Location = ConvertFromNormalizedScreenLocation(FVector2D(Payload.Param2 / uint16_MAX, Payload.Param3 / uint16_MAX));

	if (bUseMouseForTouch)
	{
		// bUseMouseForTouch フラグが有効になっているときは、
		// マウスイベントをタッチイベントとして処理を行います。
		const int32 TouchIndex = 0;
		const float TouchForce = 0.0f;
		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("MOUSE_DOWN -> TOUCH_START: TouchIndex = %d; Pos = (%d, %d); CursorPos = (%d, %d); Force = %.3f"), TouchIndex, Payload.Param2, Payload.Param3, static_cast<int>(Location.X), static_cast<int>(Location.Y), TouchForce);

		if (Delegates)
		{
			Delegates->OnTouchStartEvent.Broadcast(PlayerId, Location, TouchForce, TouchIndex);
		}

		if (ExtModule)
		{
			// Player 毎にイベントを配信します。
			if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
			{
				PlayerDelegates->OnTouchStartEvent.Broadcast(PlayerId, Location, TouchForce, TouchIndex);
			}
		}
	}
	else
	{
		EMouseButtons::Type Button = static_cast<EMouseButtons::Type>(Payload.Param1);
		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("MOUSE_DOWN: Button = %d, Pos = (%d, %d)"), Button, static_cast<int>(Location.X), static_cast<int>(Location.Y));

		if (Delegates)
		{
			Delegates->OnMouseDownEvent.Broadcast(PlayerId, Button, Location);
		}

		if (ExtModule)
		{
			// Player 毎にイベントを配信します。
			if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
			{
				PlayerDelegates->OnMouseDownEvent.Broadcast(PlayerId, Button, Location);
			}
		}
	}
}

void FStreamerExt::HandleOnMouseMove(FString PlayerId, FMemoryReader Ar)
{
	TPayloadFourParam<uint16, uint16, int16, int16> Payload(Ar);
	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleOnMouseMove() PlayerId: %s, Payload Param1: %d Param2: %d Param3: %d Param4: %d"), *PlayerId, Payload.Param1, Payload.Param2, Payload.Param3, Payload.Param4);

	FIntPoint Location = ConvertFromNormalizedScreenLocation(FVector2D(Payload.Param1 / uint16_MAX, Payload.Param2 / uint16_MAX));

	if (bUseMouseForTouch)
	{
		// bUseMouseForTouch フラグが有効になっているときは、
		// マウスイベントをタッチイベントとして処理を行います。
		const int32 TouchIndex = 0;
		const float TouchForce = 0.0f;
		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("MOUSE_MOVE -> TOUCH_MOVE: TouchIndex = %d; Pos = (%d, %d); CursorPos = (%d, %d); Force = %.3f"), TouchIndex, Payload.Param1, Payload.Param2, Location.X, Location.Y, TouchForce);

		if (Delegates)
		{
			Delegates->OnTouchMoveEvent.Broadcast(PlayerId, Location, TouchForce, TouchIndex);
		}

		if (ExtModule)
		{
			// Player 毎にイベントを配信します。
			if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
			{
				PlayerDelegates->OnTouchMoveEvent.Broadcast(PlayerId, Location, TouchForce, TouchIndex);
			}
		}
	}
	else
	{
		//																convert range from -32,768 to 32,767 -> -1,1
		FIntPoint Delta = ConvertFromNormalizedScreenLocation(FVector2D(Payload.Param3 / int16_MAX, Payload.Param4 / int16_MAX), false);
		UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("MOUSE_MOVE: Pos = (%d, %d); Delta = (%d, %d)"), Location.X, Location.Y, Delta.X, Delta.Y);

		if (Delegates)
		{
			Delegates->OnMouseMoveEvent.Broadcast(PlayerId, Location, Delta);
		}

		if (ExtModule)
		{
			// Player 毎にイベントを配信します。
			if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
			{
				PlayerDelegates->OnMouseMoveEvent.Broadcast(PlayerId, Location, Delta);
			}
		}
	}
}

void FStreamerExt::HandleOnTouchStarted(FString PlayerId, FMemoryReader Ar)
{
	TPayloadOneParam<uint8> Payload(Ar);

	uint8 NumTouches = Payload.Param1;
	for (uint8 TouchIdx = 0; TouchIdx < NumTouches; TouchIdx++)
	{
		//				  PosX    PoxY    IDX    Force  Valid
		TPayloadFiveParam<uint16, uint16, uint8, uint8, uint8> Touch(Ar);
		// If Touch is valid
		if (Touch.Param5 != 0)
		{
			//																			convert range from 0,65536 -> 0,1
			FVector2D TouchLocation = ConvertFromNormalizedScreenLocation(FVector2D(Touch.Param1 / uint16_MAX, Touch.Param2 / uint16_MAX));
			const int32 TouchIndex = Touch.Param3;
			const float TouchForce = Touch.Param4 / 255.0f;
			UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("TOUCH_START: PlayerId = %s; TouchIndex = %d; Pos = (%d, %d); CursorPos = (%d, %d); Force = %.3f"), *PlayerId, TouchIndex, Touch.Param1, Touch.Param2, static_cast<int>(TouchLocation.X), static_cast<int>(TouchLocation.Y), TouchForce);

			SCOPE_CYCLE_COUNTER(STAT_StreamerExt_HandleOnTouchStarted);
			if (Delegates)
			{
				Delegates->OnTouchStartEvent.Broadcast(PlayerId, TouchLocation, TouchForce, TouchIndex);
			}

			if (ExtModule)
			{
				// Player 毎にイベントを配信します。
				if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
				{
					PlayerDelegates->OnTouchStartEvent.Broadcast(PlayerId, TouchLocation, TouchForce, TouchIndex);
				}
			}
		}
	}
}

void FStreamerExt::HandleOnTouchMoved(FString PlayerId, FMemoryReader Ar)
{
	TPayloadOneParam<uint8> Payload(Ar);
	FCachedTouchMoveEvent& CachedTouchMoveEvent = CachedTouchMoveEvents.FindOrAdd(PlayerId);	// PlayerId の TouchMoveEvent キャッシュ情報を取得

	uint8 NumTouches = Payload.Param1;
	for (uint8 TouchIdx = 0; TouchIdx < NumTouches; TouchIdx++)
	{
		//				  PosX    PoxY    IDX    Force  Valid
		TPayloadFiveParam<uint16, uint16, uint8, uint8, uint8> Touch(Ar);
		// If Touch is valid
		if (Touch.Param5 != 0)
		{
			//																			convert range from 0,65536 -> 0,1
			FVector2D TouchLocation = ConvertFromNormalizedScreenLocation(FVector2D(Touch.Param1 / uint16_MAX, Touch.Param2 / uint16_MAX));
			const int32 TouchIndex = Touch.Param3;
			const float TouchForce = Touch.Param4 / 255.0f;
			UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("TOUCH_MOVE: PlayerId = %s; TouchIndex = %d; Pos = (%d, %d); CursorPos = (%d, %d); Force = %.3f"), *PlayerId, TouchIndex, Touch.Param1, Touch.Param2, static_cast<int>(TouchLocation.X), static_cast<int>(TouchLocation.Y), TouchForce);

			FTouchMoveEvent& TouchMoveEvent = CachedTouchMoveEvent.TouchMoveEvents.FindOrAdd(TouchIndex);	// TouchIndex のキャッシュ情報を取得
			TouchMoveEvent.Force = TouchForce;
			TouchMoveEvent.Location = TouchLocation;

			SCOPE_CYCLE_COUNTER(STAT_StreamerExt_HandleOnTouchMoved);
			if (Delegates)
			{
				Delegates->OnTouchMoveEvent.Broadcast(PlayerId, TouchLocation, TouchForce, TouchIndex);
			}

			if (ExtModule)
			{
				// Player 毎にイベントを配信します。
				if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
				{
					PlayerDelegates->OnTouchMoveEvent.Broadcast(PlayerId, TouchLocation, TouchForce, TouchIndex);
				}
			}
			TouchMoveIndicesProcessedThisFrame.Add(PlayerId);	// PlayerId を登録
		}
	}
}

void FStreamerExt::HandleOnTouchEnded(FString PlayerId, FMemoryReader Ar)
{
	TPayloadOneParam<uint8> Payload(Ar);
	uint8 NumTouches = Payload.Param1;
	FCachedTouchMoveEvent& CachedTouchMoveEvent = CachedTouchMoveEvents.FindOrAdd(PlayerId);	// PlayerId の TouchMoveEvent キャッシュ情報を取得
	for (uint8 TouchIdx = 0; TouchIdx < NumTouches; TouchIdx++)
	{					
		//				  PosX    PoxY    IDX    Force  Valid
		TPayloadFiveParam<uint16, uint16, uint8, uint8, uint8> Touch(Ar);
		// Always allowing the "up" events regardless of in or outside the valid region so
		// states aren't stuck "down". Might want to uncomment this if it causes other issues.
		// if(Touch.Param5 != 0)
		{
			//																			convert range from 0,65536 -> 0,1
			FVector2D TouchLocation = ConvertFromNormalizedScreenLocation(FVector2D(Touch.Param1 / uint16_MAX, Touch.Param2 / uint16_MAX));
			const int32 TouchIndex = Touch.Param3;
			float TouchForce = 0.0f;
			UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("TOUCH_END: PlayerId = %s; TouchIndex = %d; Pos = (%d, %d); CursorPos = (%d, %d)"), *PlayerId, Touch.Param3, Touch.Param1, Touch.Param2, static_cast<int>(TouchLocation.X), static_cast<int>(TouchLocation.Y));

			SCOPE_CYCLE_COUNTER(STAT_StreamerExt_HandleOnTouchEnded);
			if (Delegates)
			{
				Delegates->OnTouchEndEvent.Broadcast(PlayerId, TouchLocation, TouchForce, TouchIndex);
			}

			if (ExtModule)
			{
				// Player 毎にイベントを配信します。
				if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
				{
					PlayerDelegates->OnTouchEndEvent.Broadcast(PlayerId, TouchLocation, TouchForce, TouchIndex);
				}
			}
			if (CachedTouchMoveEvent.TouchMoveEvents.Contains(TouchIndex))
			{	// TouchIndex のキャッシュ情報を削除
				CachedTouchMoveEvent.TouchMoveEvents.Remove(TouchIndex);
			}

		}
	}
	if (CachedTouchMoveEvent.TouchMoveEvents.Num() == 0)
	{	// PlayerId の TouchMoveEvent キャッシュ情報を削除
		CachedTouchMoveEvents.Remove(PlayerId);
	}
}

void FStreamerExt::HandleResetBroadcastTouchMoveList()
{
	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleResetBroadcastTouchMoveList:"));
	TouchMoveIndicesProcessedThisFrame.Reset();
}

void FStreamerExt::HandleBroadcastTouchMoveList()
{
	UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleBroadcastTouchMoveList:"));
	for (TPair<FString, FCachedTouchMoveEvent> CachedTouchMoveEvent : CachedTouchMoveEvents)
	{
		const FString& PlayerId = CachedTouchMoveEvent.Key;
		const TMap<int32, FTouchMoveEvent>& TouchMoveEvents = (TMap<int32, FTouchMoveEvent>&)(CachedTouchMoveEvent.Value);

		for (TPair<int32, FTouchMoveEvent> TouchMoveEvent : TouchMoveEvents)
		{
			const int32& TouchIndex = TouchMoveEvent.Key;
			const FTouchMoveEvent& Event = TouchMoveEvent.Value;

			// Only broadcast events that haven't already been fired this frame
			if (!TouchMoveIndicesProcessedThisFrame.Contains(PlayerId))
			{
				if (Delegates)
				{
					UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleBroadcastTouchMoveList: Call Delegates Broadcast : PlayerId = %s; TouchIndex = %d; CursorPos = (%d, %d); Force = %.3f"), *PlayerId, TouchIndex, static_cast<int>(Event.Location.X), static_cast<int>(Event.Location.Y), Event.Force);
					Delegates->OnTouchMoveEvent.Broadcast(PlayerId, Event.Location, Event.Force, TouchIndex);
				}

				if (ExtModule)
				{
					// Player 毎にイベントを配信します。
					if (UPixelStreamingExtPlayerDelegates* PlayerDelegates = ExtModule->GetPixelStreamingExtPlayerDelegates(PlayerId))
					{
						UE_LOG(LogPixelStreamingExtStreamer, Verbose, TEXT("HandleBroadcastTouchMoveList: Call PlayerDelegates Broadcast : PlayerId = %s; TouchIndex = %d; CursorPos = (%d, %d); Force = %.3f"), *PlayerId, TouchIndex, static_cast<int>(Event.Location.X), static_cast<int>(Event.Location.Y), Event.Force);
						PlayerDelegates->OnTouchMoveEvent.Broadcast(PlayerId, Event.Location, Event.Force, TouchIndex);
					}
				}
			}
		}
	}
}

FIntPoint FStreamerExt::ConvertFromNormalizedScreenLocation(const FVector2D& ScreenLocation, bool bIncludeOffset)
{
	FIntPoint OutVector((int32)ScreenLocation.X, (int32)ScreenLocation.Y);

	if (TSharedPtr<FIntRect> ScreenRectPtr = TargetScreenRect)
	{
		FIntRect ScreenRect = *ScreenRectPtr;
		FIntPoint SizeInScreen = ScreenRect.Max - ScreenRect.Min;
		FVector2D OutTemp = FVector2D(SizeInScreen.X, SizeInScreen.Y) * ScreenLocation + (bIncludeOffset ? FVector2D(ScreenRect.Min.X, ScreenRect.Min.Y) : FVector2D(0, 0));
		OutVector = FIntPoint((int32)OutTemp.X, (int32)OutTemp.Y);
	}

	return OutVector;
}

void FStreamerExt::SetTargetScreenRect(TSharedPtr<FIntRect> InScreenRect)
{
	TargetScreenRect = InScreenRect;
}
