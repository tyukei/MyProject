#pragma once

#include "PixelStreamingVideoInputRHI.h"
#include "Widgets/SWindow.h"
#include "RHI.h"
#include "Delegates/IDelegateInstance.h"

class FPixelStreamingExtVideoInput : public FPixelStreamingVideoInputRHI
{
public:
	static TSharedPtr<FPixelStreamingExtVideoInput> Create(USceneCaptureComponent2D* Target);
	virtual ~FPixelStreamingExtVideoInput();
	virtual FString ToString() override;

	void Start();
	void Stop();
	void Clear();

	TSharedPtr<FIntRect> GetTargetScreenRect();

private:
	FPixelStreamingExtVideoInput(USceneCaptureComponent2D* InTarget);
	void OnBeginFrameGameThread();
	void OnEndFrameRenderThread();
	void SetEnabledForSceneCaptureComponent2D(bool Enabled);

private:
	USceneCaptureComponent2D* Target = nullptr;
};