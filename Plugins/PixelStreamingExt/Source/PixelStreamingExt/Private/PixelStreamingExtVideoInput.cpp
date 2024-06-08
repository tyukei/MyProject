#include "PixelStreamingExtVideoInput.h"
#include "PixelStreamingVideoInputRHI.h"
#include "TextureResource.h"
#include "Engine/TextureRenderTarget2D.h"
#include "Components/SceneCaptureComponent2D.h"
#include "PixelCaptureInputFrameRHI.h"

TSharedPtr<FPixelStreamingExtVideoInput> FPixelStreamingExtVideoInput::Create(USceneCaptureComponent2D* Target)
{
	return TSharedPtr<FPixelStreamingExtVideoInput>(new FPixelStreamingExtVideoInput(Target));
}

FPixelStreamingExtVideoInput::FPixelStreamingExtVideoInput(USceneCaptureComponent2D* InTarget)
	: Target(InTarget)
{
	SetEnabledForSceneCaptureComponent2D(false);
}

FPixelStreamingExtVideoInput::~FPixelStreamingExtVideoInput()
{
	Stop();
	Target = nullptr;
}

TSharedPtr<FIntRect> FPixelStreamingExtVideoInput::GetTargetScreenRect()
{
	if (Target && Target->TextureTarget)
	{
		return MakeShared<FIntRect>(0, 0, Target->TextureTarget->SizeX, Target->TextureTarget->SizeY);
	}
	return nullptr;
}

void FPixelStreamingExtVideoInput::Start()
{
	FCoreDelegates::OnBeginFrame.AddRaw(this, &FPixelStreamingExtVideoInput::OnBeginFrameGameThread);
	FCoreDelegates::OnEndFrameRT.AddRaw(this, &FPixelStreamingExtVideoInput::OnEndFrameRenderThread);
	// SceneCaptureComponent2D の bCaptureEveryFrame と bCaptureOnMovement を有効にします。
	SetEnabledForSceneCaptureComponent2D(true);
}

void FPixelStreamingExtVideoInput::Stop()
{
	SetEnabledForSceneCaptureComponent2D(false);
	FCoreDelegates::OnEndFrameRT.RemoveAll(this);
	FCoreDelegates::OnBeginFrame.RemoveAll(this);
}

void FPixelStreamingExtVideoInput::Clear()
{
	// OnFrameCaptured に登録されているイベントを解除しないとメモリリークになるので、ここで解除します。
	OnFrameCaptured.Clear();
}

void FPixelStreamingExtVideoInput::SetEnabledForSceneCaptureComponent2D(bool Enabled)
{
	if (Target)
	{
		Target->bCaptureEveryFrame = Enabled;
		Target->bCaptureOnMovement = Enabled;
	}
}

void FPixelStreamingExtVideoInput::OnBeginFrameGameThread()
{
	if (Target)
	{
		FVector CaptureLocation = Target->GetComponentLocation();
		IStreamingManager::Get().AddViewLocation(CaptureLocation);
	}
}

void FPixelStreamingExtVideoInput::OnEndFrameRenderThread()
{
	if (Target && Target->TextureTarget && Target->TextureTarget->GetResource())
	{
		if (FTexture2DRHIRef Texture = Target->TextureTarget->GetResource()->GetTexture2DRHI())
		{
			OnFrame(FPixelCaptureInputFrameRHI(Texture));
		}
	}
}

FString FPixelStreamingExtVideoInput::ToString()
{
	return TEXT("A Render Target");
}
