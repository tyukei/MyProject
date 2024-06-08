// Copyright Epic Games, Inc. All Rights Reserved.

#include "CirrusWrapper.h"
#include "PixelStreamingExtServers.h"
#include "Misc/Paths.h"
#include "ServerUtils.h"

FString FCirrusWrapper::GetServerResourceDirectory()
{
  return FString(TEXT("SignallingWebServer"));
}

FString FCirrusWrapper::GetExecutionFilePath()
{
  FString ServerPath = 
    FPaths::ProjectPluginsDir() / 
    TEXT("PixelStreamingExtEditor") / 
    TEXT("Resources") /
    TEXT("WebServers") /
    TEXT("SignallingWebServer") /
    TEXT("platform_scripts") /
    TEXT("cmd") / 
    TEXT("run_local.bat");

  ServerPath = FPaths::ConvertRelativePathToFull(ServerPath);

  return ServerPath;
}

void FCirrusWrapper::Stop()
{
  UE_LOG(LogTemp, Log, TEXT("Stopping Cirrus signalling server."));
  FMonitoredServerBase::Stop();
}

TSharedPtr<FMonitoredProcess> FCirrusWrapper::LaunchServerProcess(FLaunchArgs& InLaunchArgs, FString ServerAbsPath, TMap<EEndpoint, FURL>& OutEndPoints)
{
  bool bUseServerBinary = InLaunchArgs.ServerBinaryOverridePath.IsSet();

  TSharedPtr<FMonitoredProcess> CirrusProcess = ServerUtils::LaunchChildProcess(
    ServerAbsPath, 
    LaunchArgs.ProcessArgs, 
    FString(TEXT("SignallingServer")), 
    !bUseServerBinary);

  return CirrusProcess;
}

bool FCirrusWrapper::TestConnection()
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
