#include "PixelStreamingExtSettings.h"
#include "IPixelStreamingModule.h"

bool PixelStreamingExtSettings::CreateSignallingServerUrl(FString& OutSignallingServerURL)
{
	if (!GetSignallingServerUrl(OutSignallingServerURL))
	{
		FString SignallingServerIP;
		uint16 SignallingServerPort;
		if (GetSignallingServerIP(SignallingServerIP) && GetSignallingServerPort(SignallingServerPort))
		{
			OutSignallingServerURL = FString::Printf(TEXT("ws://%s:%d"), *SignallingServerIP, SignallingServerPort);
		}
		else
		{
			IPixelStreamingModule& Module = FModuleManager::LoadModuleChecked<IPixelStreamingModule>("PixelStreaming");
			OutSignallingServerURL = Module.GetDefaultSignallingURL();
		}
	}
	return true;
}

bool PixelStreamingExtSettings::GetSignallingServerUrl(FString& OutSignallingServerURL)
{
	return FParse::Value(FCommandLine::Get(), TEXT("PixelStreamingURL="), OutSignallingServerURL);
}

bool PixelStreamingExtSettings::GetSignallingServerIP(FString& OutSignallingServerIP)
{
	return FParse::Value(FCommandLine::Get(), TEXT("PixelStreamingIP="), OutSignallingServerIP);
}

bool PixelStreamingExtSettings::GetSignallingServerPort(uint16& OutSignallingServerPort)
{
	return FParse::Value(FCommandLine::Get(), TEXT("PixelStreamingPort="), OutSignallingServerPort);
}

bool PixelStreamingExtSettings::GetCameraResolutionLimit(uint16& MaxX, uint16& MaxY, uint16& MinX, uint16& MinY)
{
	bool flg1 = FParse::Value(FCommandLine::Get(), TEXT("MaxCameraResX="), MaxX);
	if (!flg1)
	{
		MaxX = 1920;
	}
	bool flg2 = FParse::Value(FCommandLine::Get(), TEXT("MaxCameraResY="), MaxY);
	if (!flg2)
	{
		MaxY = 1080;
	}
	bool flg3 = FParse::Value(FCommandLine::Get(), TEXT("MinCameraResX="), MinX);
	if (!flg3)
	{
		MinX = 320;
	}
	bool flg4 = FParse::Value(FCommandLine::Get(), TEXT("MinCameraResY="), MinY);
	if (!flg4)
	{
		MinY = 180;
	}
	return flg1 && flg2 && flg3 && flg4;
}

///// AI

bool PixelStreamingExtSettings::CreateAISignallingServerUrl(FString& OutSignallingServerURL)
{
	if (!GetAISignallingServerUrl(OutSignallingServerURL))
	{
		FString SignallingServerIP;
		uint16 SignallingServerPort;
		if (GetAISignallingServerIP(SignallingServerIP) && GetAISignallingServerPort(SignallingServerPort))
		{
			OutSignallingServerURL = FString::Printf(TEXT("ws://%s:%d"), *SignallingServerIP, SignallingServerPort);
		}
		else
		{
			OutSignallingServerURL = GetDefaultAISignallingURL();
		}
	}
	return true;
}

bool PixelStreamingExtSettings::GetAISignallingServerUrl(FString& OutSignallingServerURL)
{
	return FParse::Value(FCommandLine::Get(), TEXT("AISignallingServerURL="), OutSignallingServerURL);
}

bool PixelStreamingExtSettings::GetAISignallingServerIP(FString& OutSignallingServerIP)
{
	return FParse::Value(FCommandLine::Get(), TEXT("AISignallingServerIP="), OutSignallingServerIP);
}

bool PixelStreamingExtSettings::GetAISignallingServerPort(uint16& OutSignallingServerPort)
{
	return FParse::Value(FCommandLine::Get(), TEXT("AISignallingServerPort="), OutSignallingServerPort);
}

FString PixelStreamingExtSettings::GetDefaultAISignallingURL()
{
	return TEXT("ws://127.0.0.1:18888");
}
