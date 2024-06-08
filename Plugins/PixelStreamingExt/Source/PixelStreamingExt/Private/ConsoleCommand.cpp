#include "Engine.h"
#include <Kismet/GameplayStatics.h>
#include "PixelStreamingExtBlueprints.h"
#include "PixelStreamingExtSettings.h"
#include "PixelStreamingExtCameraMode.h"

DEFINE_LOG_CATEGORY_STATIC(LogPixelStreamingExtCommand, Log, All);

// ActorからStringのプロパティを取得する
FString findStringProperty(AActor* Actor, FName name)
{
	FProperty* Property = Actor->GetClass()->FindPropertyByName(name);
	if (Property)
	{
		if (FStrProperty* StrProperty = CastField<FStrProperty>(Property))
		{
			void* ValuePtr = Property->ContainerPtrToValuePtr<UObject*>(Actor);
			return StrProperty->GetPropertyValue(ValuePtr);
		}
	}
	return FString();
}

// カメラ解像度変更コマンド
// PSExt.SetRes [横幅] [高さ] [PlayerID/SceneID] で実行する。
// [PlayerID/SceneID]を省略するとすべてのカメラの解像度が変更される。
static FAutoConsoleCommandWithWorldAndArgs SetResCommand(
	TEXT("PSExt.SetRes"),
	TEXT("Set the camera resolution. PSExt.SetRes [width][height][playerId or sceneId]\n"),
	FConsoleCommandWithWorldAndArgsDelegate::CreateLambda([](const TArray<FString>& Args, UWorld* World)
	{
		if (World == nullptr)
		{
			UE_LOG(LogPixelStreamingExtCommand, Error, TEXT("PSExt.SetRes: World is null..."));
			return;
		}

		if (Args.Num() < 2)
		{
			UE_LOG(LogPixelStreamingExtCommand, Error, TEXT("Invalid arguments. PSExt.SetRes [width][height][playerId or sceneId]"));
			return;
		}

		const int Width = FCString::Atoi(*Args[0]);
		const int Height = FCString::Atoi(*Args[1]);

		// 解像度の最大、最小値チェック
		uint16 MaxX, MaxY, MinX, MinY;
		PixelStreamingExtSettings::GetCameraResolutionLimit(MaxX, MaxY, MinX, MinY);
		if (Width > MaxX || Width < MinX || Height > MaxY || Height < MinY)
		{
			UE_LOG(LogPixelStreamingExtCommand, Error, TEXT("Input resolution is out of range. Max(%d, %d), Min(%d, %d)"), MaxX, MaxY, MinX, MinY);
			return;
		} 

		FString Target;
		if (Args.Num() > 2)
		{
			Target = Args[2];
		}

		const FString _FuncCommand = FString::Printf(TEXT("ResizeScreenRes %d %d"), Width, Height);
		for (TActorIterator<AActor> Itr(World); Itr; ++Itr)
		{
			AActor* Actor = *Itr;
			if (Actor->GetClass()->GetName().Equals("BP_SceneCapture_C"))
			{
				if (Target.IsEmpty())
				{
					// すべてのカメラ
					FOutputDeviceNull ar;
					Actor->CallFunctionByNameWithArguments(*_FuncCommand, ar, NULL, true);
				} else {
					FString Val;
					// CameraModeを見てPlayerIdを使うかSceneIdを使うかを決める
					FProperty* Property = Actor->GetClass()->FindPropertyByName(TEXT("CameraMode"));
					if (Property)
					{
						if (FEnumProperty* EnumProperty = CastField<FEnumProperty>(Property))
						{
							void* ValuePtr = Property->ContainerPtrToValuePtr<UObject*>(Actor);
							int64 Value = EnumProperty->GetUnderlyingProperty()->GetSignedIntPropertyValue(ValuePtr);
							//UE_LOG(LogPixelStreamingExtCommand, Log, TEXT("camera mode: %d"), Value);
							switch ((PSExtCameraMode)Value)
							{
								case PSExtCameraMode::ThirdPerson:
								case PSExtCameraMode::ThirdPerson_AI:
									Val = findStringProperty(Actor, TEXT("PlayerId"));
									break;
								default:
									Val = findStringProperty(Actor, TEXT("SceneId"));
									break;
							}
						}
					}
					// 指定のカメラのみ
					if (Target.Equals(Val))
					{
						FOutputDeviceNull ar;
						// UE_LOG(LogPixelStreamingExtCommand, Log, TEXT("PSExt.SetRes %s"), *_FuncCommand);
						Actor->CallFunctionByNameWithArguments(*_FuncCommand, ar, NULL, true);
					}
				}
			}
		}
	})
);