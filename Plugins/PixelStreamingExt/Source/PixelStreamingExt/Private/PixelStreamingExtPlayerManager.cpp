#include "PixelStreamingExtPlayerManager.h"
#include "Misc/ScopeLock.h"

FPixelStreamingPlayer::FPixelStreamingPlayer(FPixelStreamingPlayerId InPlayerId, FString InMetaCommId)
 : PlayerId(InPlayerId), MetaCommId(InMetaCommId)
{

}

FPixelStreamingPlayer::~FPixelStreamingPlayer()
{

}

/////////////////////////

FPixelStreamingPlayerManager::FPixelStreamingPlayerManager() : Lock()
{

}

FPixelStreamingPlayerManager::~FPixelStreamingPlayerManager()
{
	Clear();
}

void FPixelStreamingPlayerManager::Clear()
{
	FScopeLock lock(&Lock);

	PlayerMap.Empty();
}

int32 FPixelStreamingPlayerManager::GetPlayerCount()
{
	FScopeLock lock(&Lock);

	return PlayerMap.Num();
}

void FPixelStreamingPlayerManager::Add(FPixelStreamingPlayerId InPlayerId, FString InMetaCommId)
{
	FScopeLock lock(&Lock);

	auto NewPlayer = MakeShared<FPixelStreamingPlayer>(InPlayerId, InMetaCommId);
	PlayerMap.Add(InPlayerId, NewPlayer);
}

void FPixelStreamingPlayerManager::Remove(FPixelStreamingPlayerId InPlayerId)
{
	FScopeLock lock(&Lock);

	PlayerMap.Remove(InPlayerId);
}

FPixelStreamingPlayerId FPixelStreamingPlayerManager::GetPlayerId(const FString InMetaCommId)
{
	FScopeLock lock(&Lock);
	for (auto& Elem : PlayerMap)
	{
		auto& Player = Elem.Value;
		if (InMetaCommId.Equals(Player->MetaCommId, ESearchCase::CaseSensitive))
		{
			return Player->PlayerId;
		}
	}
	return TEXT("-1");
}

FString FPixelStreamingPlayerManager::GetMetaCommId(FPixelStreamingPlayerId InPlayerId)
{
	FScopeLock lock(&Lock);

	auto Player = PlayerMap.Find(InPlayerId);
	if (Player != nullptr)
	{
		return (**Player).MetaCommId;
	}
	return TEXT("NULL");
}

bool FPixelStreamingPlayerManager::Contains(FPixelStreamingPlayerId InPlayerId)
{
	FScopeLock lock(&Lock);

	return PlayerMap.Contains(InPlayerId);
}