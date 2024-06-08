// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "PixelStreamingExtServers.h"
#include "MonitoredServerBase.h"

/* The NodeJS Cirrus signalling server launched as a child process. */
class FFrontEndWrapper : public FMonitoredServerBase
{
public:
  FFrontEndWrapper() = default;
  virtual ~FFrontEndWrapper() = default;

private:

protected:
  /* Begin FMonitoredServerBase interface */
  void Stop() override;
  TSharedPtr<FMonitoredProcess> LaunchServerProcess(FLaunchArgs& InLaunchArgs, FString ServerAbsPath, TMap<EEndpoint, FURL>& OutEndPoints) override;
  bool TestConnection() override;
  FString GetServerResourceDirectory() override;
  FString GetExecutionFilePath() override;
  /* End FMonitoredServerBase interface */
};
