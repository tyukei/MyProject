#include "Misc/AutomationTest.h"

#include <OSCSender.h>
#include "OSCClientMock.h"

DEFINE_SPEC(OSCSenderSpec, "PixelStreamingExt.OSCSender", EAutomationTestFlags::ProductFilter | EAutomationTestFlags::ApplicationContextMask)

void OSCSenderSpec::Define()
{
	Describe("Positive", [this]() {
		It("should successfully load OSCList", [this]() {
			FOSCSender Sender;
			FString OSCFilePath = FPaths::Combine(FPaths::ProjectDir(), "Test", "UnitTest", "OSCSender", "OSCList_1.txt");
			bool res = Sender.LoadFile(OSCFilePath);
			TestTrue("read a file",  res);

			OSCFilePath = FPaths::Combine(FPaths::ProjectDir(), "Test", "UnitTest", "OSCSender", "OSCList_10.txt");
			res = Sender.LoadFile(OSCFilePath);
			TestTrue("read many files", res);
		});

		It("should be set the OSC client", [this]() {
			FOSCSender Sender;
			UOSCClient* OSCClient = NewObject<UOSCClient>();
			TestFalse("empty at start", Sender.HasOSCClient());
			Sender.SetOSCClient(OSCClient);
			TestTrue("should have", Sender.HasOSCClient());
		});

		It("should be sent only once", [this]() {
			FOSCSender Sender;
			UOSCClientMock* OSCClient = NewObject<UOSCClientMock>();
			OSCClient->Connect();
			Sender.SetOSCClient(OSCClient);

			FString OSCFilePath = FPaths::Combine(FPaths::ProjectDir(), "Test", "UnitTest", "OSCSender", "OSCList_1.txt");
			Sender.LoadFile(OSCFilePath);

			FOSCMessage Msg;
			Sender.SendOSCMessage(Msg);

			int count = OSCClient->GetSendCount();
			TestEqual("should", count, 1);
		});

		It("should be sent as many times as the number of listings", [this]() {
			FOSCSender Sender;
			UOSCClientMock* OSCClient = NewObject<UOSCClientMock>();
			OSCClient->Connect();
			Sender.SetOSCClient(OSCClient);

			FString OSCFilePath = FPaths::Combine(FPaths::ProjectDir(), "Test", "UnitTest", "OSCSender", "OSCList_10.txt");
			Sender.LoadFile(OSCFilePath);

			FOSCMessage Msg;
			Sender.SendOSCMessage(Msg);

			int count = OSCClient->GetSendCount();
			TestEqual("should", count, 10);
		});
	});

	Describe("Negative", [this]() {
		It("should work even if the file does not exist", [this]() {
			FOSCSender Sender;
			FString OSCFilePath = FPaths::Combine(FPaths::ProjectDir(), "Test", "UnitTest", "OSCSender", "OSCList_not_exist.txt");
			bool res = Sender.LoadFile(OSCFilePath);
			TestFalse("file not exist", res);
		});
	});
}