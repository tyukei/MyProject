#pragma once

#include "OSCClient.h"
#include "OSCAddress.h"
#include "OSCManager.h"
#include "OSCMessage.h"
#include "OSCPacket.h"

class FIpHolder {
public:
	FString IPAddress;
	uint16 Port;

	FIpHolder();
	FIpHolder(const FString& InIPAddress, uint16 InPort);
};

class FOSCSender
{
private:
	// 配信先の OSC サーバのアドレスが格納されたリスト。
	TArray<TSharedPtr<FIpHolder>> IPAddressList;

	// クライアントからのイベントを配信する OSC サーバのアドレス。
	FIpHolder IPAddress;

	UOSCClient *OSCClient;

public:
	FOSCSender();
	virtual ~FOSCSender();

	void SetOSCClient(UOSCClient *client);
	bool HasOSCClient();

	bool Load();
	bool LoadFile(FString& FilePath);

	void Add(const FString& OscServerIp, uint16 OscServerPort);
	void Clear();

	void SendFromJSON(const FString& InJsonDescriptor);
	void SendOSCMessage(FOSCMessage& Message);
	void SendOSCBundle(FOSCBundle& Bundle);
};
