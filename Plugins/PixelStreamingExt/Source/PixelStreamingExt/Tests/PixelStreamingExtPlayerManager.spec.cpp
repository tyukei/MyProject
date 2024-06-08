#include "Misc/AutomationTest.h"

#include <PixelStreamingExtPlayerManager.h>

DEFINE_SPEC(PixelStreamingExtPlayerManagerSpec, "PixelStreamingExt.PixelStreamingExtPlayerManager", EAutomationTestFlags::ProductFilter | EAutomationTestFlags::ApplicationContextMask)

void PixelStreamingExtPlayerManagerSpec::Define()
{
	Describe("Positive", [this]() {
		It("should successfully Adding and removing playerId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// PlayerId を追加
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId001"));
				TestEqual("should", PlayerManager.GetPlayerCount(), 1);
			}

			{// 存在確認
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(1)), TEXT("MetaCommId001"));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId001")), ToPlayerId(1));
			}

			{// PlayerId を削除
				PlayerManager.Remove(ToPlayerId(1));
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}

			{// 削除確認
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(1)), TEXT("NULL"));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId001")), ToPlayerId(-1));
			}
		});

		It("should successfully duplicate playerId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// 同じ PlayerId を追加、上書きされて追加されないこと。
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId001"));
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId002"));
				TestEqual("should", PlayerManager.GetPlayerCount(), 1);
			}

			{// 存在確認
				// 上書きされたメタコミIDになっていること。
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(1)), TEXT("MetaCommId002"));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId002")), ToPlayerId(1));
				// 上書きされているので、以前のメタコミIDは消えていること。
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId001")), ToPlayerId(-1));
			}

			{// PlayerId を削除
				PlayerManager.Remove(ToPlayerId(1));
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}
			
			{// 削除確認
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(1)), TEXT("NULL"));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId002")), ToPlayerId(-1));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId001")), ToPlayerId(-1));
			}
		});

		It("should successfully remove non-existing playerId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// 存在しない PlayerId を削除、落ちないこと。
				PlayerManager.Remove(ToPlayerId(1));
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}
		});

		It("should successfully Clear playerId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// PlayerId を追加
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId001"));
				PlayerManager.Add(ToPlayerId(2), TEXT("MetaCommId002"));
				PlayerManager.Add(ToPlayerId(3), TEXT("MetaCommId003"));
				TestEqual("should", PlayerManager.GetPlayerCount(), 3);
			}

			{// PlayerId をすべて削除
				PlayerManager.Clear();
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}
		});

		It("should successfully Contains playerId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// PlayerId を追加
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId001"));
				PlayerManager.Add(ToPlayerId(2), TEXT("MetaCommId002"));
				PlayerManager.Add(ToPlayerId(3), TEXT("MetaCommId003"));
				TestEqual("should", PlayerManager.GetPlayerCount(), 3);
			}

			{// PlayerId が存在しているか確認します。
				TestTrue("should have playerId=1", PlayerManager.Contains(ToPlayerId(1)));
				TestTrue("should have playerId=2", PlayerManager.Contains(ToPlayerId(2)));
				TestTrue("should have playerId=3", PlayerManager.Contains(ToPlayerId(3)));
				TestFalse("should not have playerId=4", PlayerManager.Contains(ToPlayerId(4)));
			}

			{// PlayerId をすべて削除
				PlayerManager.Clear();
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}
		});

		It("should successfully Get MetaCommId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// PlayerId を追加
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId001"));
				PlayerManager.Add(ToPlayerId(2), TEXT("MetaCommId002"));
				PlayerManager.Add(ToPlayerId(3), TEXT("MetaCommId003"));
				TestEqual("should", PlayerManager.GetPlayerCount(), 3);
			}

			{// PlayerId に対応する メタコミIDが取得できるか。
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(1)), TEXT("MetaCommId001"));
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(2)), TEXT("MetaCommId002"));
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(3)), TEXT("MetaCommId003"));
				TestEqual("should", PlayerManager.GetMetaCommId(ToPlayerId(4)), TEXT("NULL"));
			}

			{// PlayerId をすべて削除
				PlayerManager.Clear();
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}
		});
		
		It("should successfully Get PlayerId.", [this]() {
			FPixelStreamingPlayerManager PlayerManager;

			{// PlayerId を追加
				PlayerManager.Add(ToPlayerId(1), TEXT("MetaCommId001"));
				PlayerManager.Add(ToPlayerId(2), TEXT("MetaCommId002"));
				PlayerManager.Add(ToPlayerId(3), TEXT("MetaCommId003"));
				TestEqual("should", PlayerManager.GetPlayerCount(), 3);
			}

			{// PlayerId に対応する メタコミIDが取得できるか。
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId001")), ToPlayerId(1));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId002")), ToPlayerId(2));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId003")), ToPlayerId(3));
				TestEqual("should", PlayerManager.GetPlayerId(TEXT("MetaCommId004")), TEXT("-1"));
			}

			{// PlayerId をすべて削除
				PlayerManager.Clear();
				TestEqual("should", PlayerManager.GetPlayerCount(), 0);
			}
		});
	});

	Describe("Negative", [this]() {
	});
}