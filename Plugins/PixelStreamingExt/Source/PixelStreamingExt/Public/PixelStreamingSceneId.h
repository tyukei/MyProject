// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"

using FPixelStreamingSceneId = FString;

PIXELSTREAMINGEXT_API inline FPixelStreamingSceneId ToSceneId(FString SceneIdString)
{
	return FPixelStreamingSceneId(SceneIdString);
}

PIXELSTREAMINGEXT_API inline FPixelStreamingSceneId ToSceneId(int32 SceneIdInteger)
{
	return FString::FromInt(SceneIdInteger);
}

PIXELSTREAMINGEXT_API inline int32 SceneIdToInt(FPixelStreamingSceneId SceneId)
{
	return FCString::Atoi(*SceneId);
}

static const FPixelStreamingSceneId INVALID_SCENE_ID = ToSceneId(FString(TEXT("Invalid Scene Id")));
static const FPixelStreamingSceneId SFU_SCENE_ID = FString(TEXT("1"));