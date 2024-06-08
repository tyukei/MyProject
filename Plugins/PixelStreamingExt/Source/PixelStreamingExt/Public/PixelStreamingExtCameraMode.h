#pragma once

#include "CoreMinimal.h"

UENUM(BlueprintType)
enum class PSExtCameraMode : uint8
{
	ThirdPerson			UMETA(DisplayName = "3rdPerson"),
	Fixed						UMETA(DisplayName = "Fixed"),
	ThirdPerson_AI	UMETA(DisplayName = "3rdPersonAI"),
	Fixed_AI				UMETA(DisplayName = "FixedAI"),
};

PIXELSTREAMINGEXT_API inline FString ToCameraMode(PSExtCameraMode CameraMode)
{
	switch (CameraMode) {
		default:
		case PSExtCameraMode::ThirdPerson:
			return TEXT("3rdPerson");
		case PSExtCameraMode::Fixed:
			return TEXT("Fixed");
		case PSExtCameraMode::ThirdPerson_AI:
			return TEXT("3rdPersonAI");
		case PSExtCameraMode::Fixed_AI:
			return TEXT("FixedAI");
	}
}
