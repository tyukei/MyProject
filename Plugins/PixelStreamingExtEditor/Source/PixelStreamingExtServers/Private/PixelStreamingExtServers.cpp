// Copyright Epic Games, Inc. All Rights Reserved.

#include "PixelStreamingExtServers.h"
#include "CirrusWrapper.h"
#include "SFUWrapper.h"
#include "FrontEndWrapper.h"
#include "ServerUtils.h"

TSharedPtr<IServer> FPixelStreamingExtServers::MakeCirrusServer()
{
  return MakeShared<FCirrusWrapper>();
}

TSharedPtr<IServer> FPixelStreamingExtServers::MakeSFUServer()
{
  return MakeShared<FSFUWrapper>();
}

TSharedPtr<IServer> FPixelStreamingExtServers::MakeFrontEndServer()
{
  return MakeShared<FFrontEndWrapper>();
}

TSharedPtr<FMonitoredProcess> FPixelStreamingExtServers::DownloadPixelStreamingServers()
{
  return ServerUtils::DownloadPixelStreamingServers(false);
}

TSharedPtr<FMonitoredProcess> FPixelStreamingExtServers::DeletePixelStreamingServers()
{
  return ServerUtils::DeletePixelStreamingServers();
}