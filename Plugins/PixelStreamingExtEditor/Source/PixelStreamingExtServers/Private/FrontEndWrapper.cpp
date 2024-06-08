// Copyright Epic Games, Inc. All Rights Reserved.

#include "FrontEndWrapper.h"
#include "PixelStreamingExtServers.h"
#include "Misc/Paths.h"
#include "ServerUtils.h"

FString FFrontEndWrapper::GetServerResourceDirectory()
{
  return FString(TEXT("CloudRenderingJS"));
}

FString FFrontEndWrapper::GetExecutionFilePath()
{
  FString ServerPath = 
    FPaths::ProjectPluginsDir() / 
    TEXT("PixelStreamingExtEditor") / 
    TEXT("Resources") /
    TEXT("WebServers") /
    TEXT("CloudRenderingJS") /
    TEXT("run-app.bat");

  ServerPath = FPaths::ConvertRelativePathToFull(ServerPath);

  return ServerPath;
}

void FFrontEndWrapper::Stop()
{
  UE_LOG(LogTemp, Log, TEXT("Stopping FrontEnd server."));
  FMonitoredServerBase::Stop();
}

TSharedPtr<FMonitoredProcess> FFrontEndWrapper::LaunchServerProcess(FLaunchArgs& InLaunchArgs, FString ServerAbsPath, TMap<EEndpoint, FURL>& OutEndPoints)
{
  bool bUseServerBinary = InLaunchArgs.ServerBinaryOverridePath.IsSet();

  TSharedPtr<FMonitoredProcess> CirrusProcess = ServerUtils::LaunchChildProcess(
    ServerAbsPath, 
    LaunchArgs.ProcessArgs, 
    FString(TEXT("CloudRenderingJS")),
    !bUseServerBinary);

  return CirrusProcess;
}

bool FFrontEndWrapper::TestConnection()
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
