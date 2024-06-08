#pragma once

#include <OSCClient.h>
#include "OSCClientMock.generated.h"

class FOSCClientProxyMock : public IOSCClientProxy
{
public:
	FOSCClientProxyMock(const FString& InClientName)
	{
		sendCount = 0;
	}
	virtual ~FOSCClientProxyMock()
	{
		UE_LOG(LogTemp, Log, TEXT("~FOSCClientProxyMock"));
	}

	void GetSendIPAddress(FString& InIPAddress, int32& Port) const override {}
	bool SetSendIPAddress(const FString& InIPAddress, const int32 Port) override { return true; }
	bool IsActive() const override { return true; }
	void SendBundle(FOSCBundle& Bundle) override {}
	void Stop() override {}

	void SendMessage(FOSCMessage& Message) override
	{
		sendCount++;
	}

	int sendCount;
};

UCLASS()
class UOSCClientMock : public UOSCClient
{
	GENERATED_BODY()

public:
	FOSCClientProxyMock* ProxyMock;

	virtual ~UOSCClientMock()
	{
		UE_LOG(LogTemp, Log, TEXT("~UOSCClientMock"));
	}

	void Connect()
	{
		ProxyMock = new FOSCClientProxyMock(GetName());
		ClientProxy.Reset(ProxyMock);
	}

	int GetSendCount()
	{
		return ProxyMock->sendCount;
	}
};
