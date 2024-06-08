// Fill out your copyright notice in the Description page of Project Settings.

#include "SceneCaptureActorComponent.h"
#include "Components/SceneCaptureComponent2D.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Engine/World.h"
#include "Misc/CoreDelegates.h"
#include "Misc/CString.h"
#include "PixelCaptureInputFrameRHI.h"
#include "PixelStreamingVideoInputRHI.h"
#include "PixelStreamingExtDelegates.h"
#include "PixelStreamingExtVideoInput.h"
#include "StreamerExt.h"

DEFINE_LOG_CATEGORY_STATIC(LogPixelStreamingExtActor, Log, All);

// Sets default values for this component's properties
USceneCaptureActorComponent::USceneCaptureActorComponent()
{
	// Set this component to be initialized when the game starts, and to be ticked every frame.  You can turn these features
	// off to improve performance if you don't need them.
	PrimaryComponentTick.bCanEverTick = false;
}

// Called when the game starts
void USceneCaptureActorComponent::BeginPlay()
{
	Super::BeginPlay();

	// ...

}

void USceneCaptureActorComponent::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
	Super::EndPlay(EndPlayReason);

	// ...

	// 停止時には映像配信を停止しておきます。
	DisconnectSignalling();
}

void USceneCaptureActorComponent::ConnectSignalling()
{
	if (!CheckParameters())
	{
		return;
	}

	if (!StreamerExt.IsValid())
	{
		FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
		StreamerExt = Module.CreateStreamer(SceneId, PlayerId, ToCameraMode(CameraMode));

		if (StreamerExt.IsValid())
		{
			if (IsDisplay)
			{
				if (USceneCaptureComponent2D* CaptureComponent = Cast<USceneCaptureComponent2D>(SceneCapture.GetComponent(GetOwner())))
				{
					VideoInput = FPixelStreamingExtVideoInput::Create(CaptureComponent);
					StreamerExt->SetVideoInput(VideoInput);
				}
			}
			StreamerExt->ConnectToSignallingServer();
		}
		else
		{
			UE_LOG(LogPixelStreamingExtActor, Log, TEXT("Failed to initialize FStreamerExt."));
		}
	}
	else
	{
		UE_LOG(LogPixelStreamingExtActor, Log, TEXT("SingallingServer has already connected."));
	}
}

void USceneCaptureActorComponent::ResetTargetScreenRect()
{
	if (VideoInput.IsValid())
	{
		// カメラのサイズを FStreamerExt に設定します。
		TSharedPtr<FIntRect> Rect = VideoInput->GetTargetScreenRect();
		StreamerExt->SetTargetScreenRect(Rect);
	}
}

	void USceneCaptureActorComponent::DisconnectSignalling()
{
	StopStreaming();

	if (StreamerExt.IsValid())
	{
		StreamerExt->DisconnectToSignallingServer();
		StreamerExt->DestroyStreamer();
		StreamerExt = nullptr;

		FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
		Module.DeleteStreamer(SceneId);
	}
	else
	{
		UE_LOG(LogPixelStreamingExtActor, Log, TEXT("SingallingServer has already disconnected."));
	}

	if (VideoInput.IsValid())
	{
		VideoInput->Stop();
		VideoInput->Clear();
		VideoInput = nullptr;
	}
}

void USceneCaptureActorComponent::StartStreaming()
{
	if (!CheckParameters())
	{
		return;
	}

	// シグナリングサーバに接続されていない場合に、接続を行います。
	ConnectSignalling();

	if (StreamerExt.IsValid())
	{
		if (!StreamerExt->Streamer->IsStreaming())
		{
			if (VideoInput.IsValid())
			{
				// カメラのサイズを FStreamerExt に設定します。
				TSharedPtr<FIntRect> Rect = VideoInput->GetTargetScreenRect();
				StreamerExt->SetTargetScreenRect(Rect);
				// 映像を PixelStreaming に配信を開始します。
				VideoInput->Start();
			}
			StreamerExt->StartStreaming();
		}
		else
		{
			UE_LOG(LogPixelStreamingExtActor, Log, TEXT("Streaming has already started."));
		}
	}
	else
	{
		UE_LOG(LogPixelStreamingExtActor, Log, TEXT("Streaming is not initialize."));
	}
}

void USceneCaptureActorComponent::StopStreaming()
{
	if (StreamerExt.IsValid())
	{
		if (StreamerExt->Streamer->IsStreaming())
		{
			if (VideoInput.IsValid())
			{
				VideoInput->Stop();
			}
			StreamerExt->StopStreaming();
		}
		else
		{
			UE_LOG(LogPixelStreamingExtActor, Log, TEXT("Streaming has already stopped."));
		}
	}
	else
	{
		UE_LOG(LogPixelStreamingExtActor, Log, TEXT("Streaming is not initialize."));
	}
}

bool USceneCaptureActorComponent::CheckParameters()
{
	// パラメータチェック
	if (SceneId.Equals("NULL", ESearchCase::CaseSensitive))
	{
		UE_LOG(LogPixelStreamingExtActor, Warning, TEXT("Invalid Parameter SceneId: NULL"));
		return false;
	}
	if (SceneId.IsEmpty())
	{
		UE_LOG(LogPixelStreamingExtActor, Warning, TEXT("Invalid Parameter SceneId: Length is 0"));
		return false;
	}
	return true;
}


bool USceneCaptureActorComponent::DeprojectToWorld(const FVector2D& TargetXY, FVector& WorldPosition, FVector& WorldDirection)
{
	if (USceneCaptureComponent2D* SceneCaptureComponent2D = Cast<USceneCaptureComponent2D>(SceneCapture.GetComponent(GetOwner())))
	{
		FMinimalViewInfo ViewInfo;
		SceneCaptureComponent2D->GetCameraView(0.0f, ViewInfo);

		FMatrix ProjectionMatrix;
		if (SceneCaptureComponent2D->bUseCustomProjectionMatrix)
		{
			ProjectionMatrix = AdjustProjectionMatrixForRHI(SceneCaptureComponent2D->CustomProjectionMatrix);
		}
		else //
		{
			ProjectionMatrix = AdjustProjectionMatrixForRHI(ViewInfo.CalculateProjectionMatrix());
		}
		FMatrix InvProjectionMatrix = ProjectionMatrix.Inverse();

		// A view matrix is the inverse of the viewer's matrix, so an inverse view matrix is just the viewer's matrix.
		// To save precision, we directly compute the viewer's matrix, plus it also avoids the cost of the inverse.
		// The matrix to convert from world coordinate space to view coordinate space also needs to be included (this
		// is the transpose of the similar matrix used in CalculateViewProjectionMatricesFromMinimalView).
		FMatrix InvViewMatrix = FMatrix(
									FPlane(0, 1, 0, 0),
									FPlane(0, 0, 1, 0),
									FPlane(1, 0, 0, 0),
									FPlane(0, 0, 0, 1))
			* FRotationTranslationMatrix(ViewInfo.Rotation, ViewInfo.Location);

		FIntPoint TargetSize = FIntPoint(SceneCaptureComponent2D->TextureTarget->SizeX, SceneCaptureComponent2D->TextureTarget->SizeY);

		FSceneView::DeprojectScreenToWorld(
			TargetXY,
			FIntRect(FIntPoint(0, 0), TargetSize),
			InvViewMatrix,
			InvProjectionMatrix,
			WorldPosition,
			WorldDirection);

		return true;
	}

	// something went wrong, zero things and return false
	WorldPosition = FVector::ZeroVector;
	WorldDirection = FVector::ZeroVector;
	return false;
}