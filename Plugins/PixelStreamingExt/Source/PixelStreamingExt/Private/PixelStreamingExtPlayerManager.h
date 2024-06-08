#pragma once

#include "PixelStreamingPlayerId.h"
#include "HAL/CriticalSection.h"

// TODO: PlayerIdの管理をきれいにできないか検討が必要です。

class FPixelStreamingPlayer
{
public:
	FPixelStreamingPlayer(FPixelStreamingPlayerId InPlayerId, FString InMetaCommId);
	virtual ~FPixelStreamingPlayer();

public:
	FPixelStreamingPlayerId PlayerId;
	FString MetaCommId;
};

class FPixelStreamingPlayerManager
{
public:
	FPixelStreamingPlayerManager();
	virtual ~FPixelStreamingPlayerManager();

	int32 GetPlayerCount();
	void Add(FPixelStreamingPlayerId InPlayerId, FString InMetaCommId);
	void Remove(FPixelStreamingPlayerId InPlayerId);
	void Clear();
	bool Contains(FPixelStreamingPlayerId InPlayerId);

	FPixelStreamingPlayerId GetPlayerId(const FString InMetaCommId);
	FString GetMetaCommId(FPixelStreamingPlayerId InPlayerId);

private:
	TMap<FPixelStreamingPlayerId, TSharedPtr<FPixelStreamingPlayer>> PlayerMap;
	FCriticalSection Lock;
};