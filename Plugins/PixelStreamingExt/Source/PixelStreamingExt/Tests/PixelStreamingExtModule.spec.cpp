#include "Misc/AutomationTest.h"

#include <PixelStreamingExtModule.h>

DEFINE_SPEC(PixelStreamingExtModuleSpec, "PixelStreamingExt.PixelStreamingExtModule", EAutomationTestFlags::ProductFilter | EAutomationTestFlags::ApplicationContextMask)

void PixelStreamingExtModuleSpec::Define()
{
	Describe("Positive", [this]() {
		It("should not return null.", [this]() {
			{ // Delegateがnullになることはないはず
				FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
				auto Delegate = Module.GetPixelStreamingExtPlayerDelegates("1");
				TestNotNull("should", Delegate);
				Delegate = Module.GetPixelStreamingExtPlayerDelegates("100");
				TestNotNull("should", Delegate);
				Delegate = Module.GetPixelStreamingExtPlayerDelegates("abc");
				TestNotNull("should", Delegate);
				Delegate = Module.GetPixelStreamingExtPlayerDelegates("@+%*<>/");
				TestNotNull("should", Delegate);
			}
		});

		It("should return the same Delegate for the same PlayerID.", [this]() {
			{ // 同じPlayerIDには同じDelegateが返るはず
				FPixelStreamingExtModule& Module = FModuleManager::LoadModuleChecked<FPixelStreamingExtModule>("PixelStreamingExt");
				auto DelegateA = Module.GetPixelStreamingExtPlayerDelegates("1");
				auto DelegateB = Module.GetPixelStreamingExtPlayerDelegates("1");
				TestEqual("should", DelegateA, DelegateB);
				DelegateA = Module.GetPixelStreamingExtPlayerDelegates("a");
				DelegateB = Module.GetPixelStreamingExtPlayerDelegates("a");
				TestEqual("should", DelegateA, DelegateB);
				DelegateA = Module.GetPixelStreamingExtPlayerDelegates("1");
				DelegateB = Module.GetPixelStreamingExtPlayerDelegates("a");
				TestNotEqual("should", DelegateA, DelegateB);
			}
		});
	});

	Describe("Negative", [this]() {
	});
}