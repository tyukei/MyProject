// Copyright Epic Games, Inc. All Rights Reserved.

#include "SFUWrapper.h"
#include "PixelStreamingExtServers.h"
#include "Misc/Paths.h"
#include "ServerUtils.h"

FString FSFUWrapper::GetServerResourceDirectory()
{
  return FString(TEXT("SFUServer"));
}

FString FSFUWrapper::GetExecutionFilePath()
{
  FString ServerPath = 
    FPaths::ProjectPluginsDir() / 
    TEXT("PixelStreamingExtEditor") / 
    TEXT("Resources") /
    TEXT("WebServers") /
    TEXT("SFU") /
    TEXT("platform_scripts") /
    TEXT("cmd") / 
    TEXT("run.bat");

  ServerPath = FPaths::ConvertRelativePathToFull(ServerPath);

  return ServerPath;
}

void FSFUWrapper::Stop()
{
  UE_LOG(LogTemp, Log, TEXT("Stopping SFU server."));
  FMonitoredServerBase::Stop();
}

TSharedPtr<FMonitoredProcess> FSFUWrapper::LaunchServerProcess(FLaunchArgs& InLaunchArgs, FString ServerAbsPath, TMap<EEndpoint, FURL>& OutEndPoints)
{
  bool bUseServerBinary = InLaunchArgs.ServerBinaryOverridePath.IsSet();

  TSharedPtr<FMonitoredProcess> CirrusProcess = ServerUtils::LaunchChildProcess(
    ServerAbsPath, 
    LaunchArgs.ProcessArgs, 
    FString(TEXT("SFUServer")),
	!bUseServerBinary);

  return CirrusProcess;
}

bool FSFUWrapper::TestConnection()
{
  if (bIsReady)
  {
    return true;
  }
  else
  {
    return true;
  }
}
