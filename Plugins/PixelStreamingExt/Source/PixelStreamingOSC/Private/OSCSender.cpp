#include "OSCSender.h"
#include "JsonUtilities.h"
#include "Runtime/Json/Public/Serialization/JsonReader.h"
#include "Misc/FileHelper.h"

FIpHolder::FIpHolder()
{
	IPAddress = TEXT("127.0.0.1");
	Port = 9000;
}

FIpHolder::FIpHolder(const FString& InIPAddress, uint16 InPort) : IPAddress(InIPAddress), Port(InPort)
{
}

FOSCSender::FOSCSender()
{
	OSCClient = nullptr;
	Load();
}

FOSCSender::~FOSCSender()
{
	OSCClient = nullptr;
}

void FOSCSender::SetOSCClient(UOSCClient *client)
{
	OSCClient = client;
}

bool FOSCSender::HasOSCClient()
{
	return OSCClient != nullptr;
}

bool FOSCSender::Load()
{
	// 指定されたファイルから OSC サーバのリストを取得
	FString FilePath;

	if (FParse::Value(FCommandLine::Get(), TEXT("OscServerFilePath="), FilePath))
	{
		LoadFile(FilePath);
	}

	// ファイルが指定されていない場合には、以下の設定を行う。
	// OSC のアドレス、ポート番号を設定します。
	FString OscServerIp;
	uint16 OscServerPort = 9000;

	if (!FParse::Value(FCommandLine::Get(), TEXT("OscServerIp="), OscServerIp))
	{
		OscServerIp = TEXT("127.0.0.1");
	}

	if (!FParse::Value(FCommandLine::Get(), TEXT("OscServerPort="), OscServerPort))
	{
		OscServerPort = 9000;
	}

	IPAddress.IPAddress = OscServerIp;
	IPAddress.Port = OscServerPort;

	return true;
}

bool FOSCSender::LoadFile(FString& FilePath)
{
	FString FileData;

	if (!FPlatformFileManager::Get().GetPlatformFile().FileExists(*FilePath))
	{
		return false;
	}

	const int64 FileSize = FPlatformFileManager::Get().GetPlatformFile().FileSize(*FilePath);
	FFileHelper::LoadFileToString(FileData, *FilePath);

	FString ReadLine;
	FString Remainder;

	while (FileData.Split(TEXT("\n"), &ReadLine, &Remainder))
	{
		ReadLine = ReadLine.TrimStartAndEnd();

		FString OscServerIp, PortString;
		if (ReadLine.Split(TEXT(":"), &OscServerIp, &PortString))
		{
			uint16 OscServerPort = FCString::Atoi(*PortString);
			Add(OscServerIp, OscServerPort);
		}

		FileData = Remainder;
	}

	if (!FileData.IsEmpty())
	{
		FileData = FileData.TrimStartAndEnd();

		FString OscServerIp, PortString;
		if (FileData.Split(TEXT(":"), &OscServerIp, &PortString))
		{
			uint16 OscServerPort = FCString::Atoi(*PortString);
			Add(OscServerIp, OscServerPort);
		}
	}

	return true;
}

void FOSCSender::Add(const FString& OscServerIp, uint16 OscServerPort)
{
	TSharedPtr<FIpHolder> IpHolder(new FIpHolder(OscServerIp, OscServerPort));
	IPAddressList.Add(IpHolder);
}

void FOSCSender::Clear()
{
	IPAddressList.Empty();
}

void FOSCSender::SendFromJSON(const FString& InJsonDescriptor)
{
	TSharedPtr<FJsonObject> JsonRootObject = MakeShareable(new FJsonObject());
	TSharedRef<TJsonReader<>> JsonReader = TJsonReaderFactory<>::Create(InJsonDescriptor);
	if (FJsonSerializer::Deserialize(JsonReader, JsonRootObject))
	{
		FString Path = JsonRootObject->GetStringField("path");
		FString Type = JsonRootObject->GetStringField("type");

		TArray<TCHAR>& TypeArray = Type.GetCharArray();

		FOSCMessage Message;
		FOSCAddress Address(Path);

		UOSCManager::SetOSCMessageAddress(Message, Address);

		int index = 0;
		for (TSharedPtr<FJsonValue> V : JsonRootObject->GetArrayField("data"))
		{
			if (TypeArray.Num() <= index)
			{
				UOSCManager::AddString(Message, TCHAR_TO_ANSI(*(V->AsString())));
			}
			else
			{
				switch (TypeArray[index++]) {
				case 'i':
				case 'I':
					UOSCManager::AddInt32(Message, FCString::Atoi(*(V->AsString())));
					break;
				case 'f':
				case 'F':
					UOSCManager::AddFloat(Message, FCString::Atof(*(V->AsString())));
					break;
				case 's':
				case 'S':
				default:
					UOSCManager::AddString(Message, TCHAR_TO_ANSI(*(V->AsString())));
					break;
				}
			}
		}
	
		if (OSCClient && OSCClient->SetSendIPAddress(IPAddress.IPAddress, IPAddress.Port))
		{
			OSCClient->SendOSCMessage(Message);
		}
	}
}

void FOSCSender::SendOSCMessage(FOSCMessage& Message)
{
	if (!OSCClient)
	{
		return;
	}

	for (TSharedPtr<FIpHolder> Holder : IPAddressList)
	{
		if (OSCClient->SetSendIPAddress(Holder->IPAddress, Holder->Port))
		{
			OSCClient->SendOSCMessage(Message);
		}
	}
}

void FOSCSender::SendOSCBundle(FOSCBundle& Bundle)
{
	if (!OSCClient)
	{
		return;
	}

	for (TSharedPtr<FIpHolder> Holder : IPAddressList)
	{
		if (OSCClient->SetSendIPAddress(Holder->IPAddress, Holder->Port))
		{
			OSCClient->SendOSCBundle(Bundle);
		}
	}
}
