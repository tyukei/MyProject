// Copyright Epic Games, Inc. All Rights Reserved.

#include "ServerUtils.h"
#include "HAL/PlatformFileManager.h"
#include "PixelStreamingExtServers.h"
#include "Containers/UnrealString.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Serialization/JsonReader.h"
#include "Policies/CondensedJsonPrintPolicy.h"
#include "Misc/Paths.h"
#include "GenericPlatform/GenericPlatformFile.h"

TSharedPtr<FMonitoredProcess> ServerUtils::LaunchChildProcess(FString ExecutableAbsPath, FString Args, FString LogPrefix, bool bRunAsScript)
{
  // Check if the binary actually exists
  IPlatformFile& FileManager = FPlatformFileManager::Get().GetPlatformFile();
  if (!FileManager.FileExists(*ExecutableAbsPath))
  {
    UE_LOG(LogTemp, Error, TEXT("Cannot start child process - the specified file did not exist. File=%s"), *ExecutableAbsPath);
    return TSharedPtr<FMonitoredProcess>();
  }

  if (bRunAsScript)
  {
// Get the executable we will use to run the scripts (e.g. cmd.exe on Windows)
#if PLATFORM_WINDOWS
    Args = FString::Printf(TEXT("/c \"%s\" %s"), *ExecutableAbsPath, *Args);
    ExecutableAbsPath = TEXT("cmd.exe");
#elif PLATFORM_LINUX
    Args = FString::Printf(TEXT(" -- \"%s\" %s --nosudo"), *ExecutableAbsPath, *Args);
    ExecutableAbsPath = TEXT("/usr/bin/bash");
#else
    UE_LOG(LogTemp, Error, TEXT("Unsupported platform for Pixel Streaming."));
    return TSharedPtr<FMonitoredProcess>();
#endif
  }

  TSharedPtr<FMonitoredProcess> ChildProcess = MakeShared<FMonitoredProcess>(ExecutableAbsPath, Args, true, true);
  // Bind to output so we can capture the output in the log
  ChildProcess->OnOutput().BindLambda([LogPrefix](FString Output) {
    if (Output.MatchesWildcard(TEXT("\x1b[*m")))
    {
      Output.ReplaceInline(TEXT("\x1b[0m"), TEXT(""));
      Output.ReplaceInline(TEXT("\x1b[1m"), TEXT(""));
      for (size_t i = 30; i < 40; i++)
      {
        Output.ReplaceInline(*FString::Printf(TEXT("\x1b[%dm"), i), TEXT(""));
      }
    }
    UE_LOG(LogTemp, Log, TEXT("%s - %s"), *LogPrefix, *Output);
  });
  // Run the child process
  UE_LOG(LogTemp, Log, TEXT("Launch child process - %s %s"), *ExecutableAbsPath, *Args);
  ChildProcess->Launch();
  return ChildProcess;
}

bool ServerUtils::ExtractValueFromArgs(FString ArgsString, FString ArgKey, FString FallbackValue, FString& OutValue)
{
  // Tokenize string in single whitespace " ".
  TArray<FString> ArgTokens;
  ArgsString.ParseIntoArray(ArgTokens, TEXT(" "), true);

  for (FString& Token : ArgTokens)
  {
    Token.TrimStartAndEndInline();

    if (!Token.StartsWith(ArgKey, ESearchCase::Type::CaseSensitive))
    {
      continue;
    }

    // We have a matching token for our search "key" - split on it.
    FString RightStr;
    if (!Token.Split(TEXT("="), nullptr, &RightStr))
    {
      continue;
    }

    OutValue = RightStr;
    return true;
  }
  OutValue = FallbackValue;
  return false;
}

FString ServerUtils::QueryOrSetProcessArgs(FLaunchArgs& LaunchArgs, FString ArgKey, FString FallbackArgValue)
{
  FString OutValue;
  bool bExtractedValue = ExtractValueFromArgs(LaunchArgs.ProcessArgs, ArgKey, FallbackArgValue, OutValue);

  // No key was present so we will inject our own.
  if (!bExtractedValue)
  {
    LaunchArgs.ProcessArgs += FString::Printf(TEXT(" %s%s"), *ArgKey, *FallbackArgValue);
  }

  return OutValue;
}

bool ServerUtils::GetResourcesDir(FString& OutResourcesDir)
{
  OutResourcesDir = 
      FPaths::ProjectPluginsDir() / 
      TEXT("PixelStreamingExtEditor") / 
      TEXT("Resources");

  OutResourcesDir = FPaths::ConvertRelativePathToFull(OutResourcesDir);
  return FPaths::DirectoryExists(OutResourcesDir);
}

bool ServerUtils::GetWebServersDir(FString& OutWebServersAbsPath)
{
  bool bResourceDirExists = GetResourcesDir(OutWebServersAbsPath);

  if(!bResourceDirExists)
  {
    return false;
  }

  OutWebServersAbsPath = OutWebServersAbsPath / TEXT("WebServers");
  return FPaths::DirectoryExists(OutWebServersAbsPath);
}

bool ServerUtils::GetDownloadedServer(FString& OutAbsPath)
{
  bool bServersDirExists = GetWebServersDir(OutAbsPath);

  if(!bServersDirExists)
  {
    return false;
  }

#if PLATFORM_WINDOWS
  OutAbsPath = OutAbsPath / TEXT("setup_node.bat");
#elif PLATFORM_LINUX
  OutAbsPath = OutAbsPath / TEXT("setup_node.sh");
#else
  UE_LOG(LogTemp, Error, TEXT("Unsupported platform for Pixel Streaming scripts."));
  return false;
#endif

  IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();
  return PlatformFile.FileExists(*OutAbsPath);
}


bool ServerUtils::GetClearServer(FString& OutAbsPath)
{
  bool bServersDirExists = GetWebServersDir(OutAbsPath);

  if(!bServersDirExists)
  {
    return false;
  }

#if PLATFORM_WINDOWS
  OutAbsPath = OutAbsPath / TEXT("clear_node.bat");
#elif PLATFORM_LINUX
  OutAbsPath = OutAbsPath / TEXT("clear_node.sh");
#else
  UE_LOG(LogTemp, Error, TEXT("Unsupported platform for Pixel Streaming scripts."));
  return false;
#endif

  IPlatformFile& PlatformFile = FPlatformFileManager::Get().GetPlatformFile();
  return PlatformFile.FileExists(*OutAbsPath);
}


TSharedPtr<FMonitoredProcess> ServerUtils::DownloadPixelStreamingServers(bool bSkipIfPresent)
{
  FString OutScriptPath;
  if (bSkipIfPresent && GetDownloadedServer(OutScriptPath))
  {
    UE_LOG(LogTemp, Log, TEXT("Found pixel streaming servers, skipping download."));
    // empty process
    return TSharedPtr<FMonitoredProcess>();
  }
  
  bool bHasWebServersDir = GetWebServersDir(OutScriptPath);
  if (!bHasWebServersDir)
  {
    UE_LOG(LogTemp, Error, TEXT("Could not download ps servers, no PixelStreaming/Resources/WebServers directory found."));
  }

  FString Args = TEXT("");
#if PLATFORM_WINDOWS
  OutScriptPath = OutScriptPath / TEXT("setup_node.bat");
#elif PLATFORM_LINUX
  OutScriptPath = OutScriptPath / TEXT("setup_node.sh");
#else
  UE_LOG(LogTemp, Error, TEXT("Unsupported platform for Pixel Streaming scripts."));
  // empty process
  return TSharedPtr<FMonitoredProcess>();
#endif

  return LaunchChildProcess(OutScriptPath, Args, FString(TEXT("Download ps servers")), true /*bRunAsScript*/);
}

TSharedPtr<FMonitoredProcess> ServerUtils::DeletePixelStreamingServers()
{
  FString OutScriptPath;
  if (!GetClearServer(OutScriptPath))
  {
    UE_LOG(LogTemp, Log, TEXT("Not Found pixel streaming servers."));
    return TSharedPtr<FMonitoredProcess>();
  }
  
  bool bHasWebServersDir = GetWebServersDir(OutScriptPath);
  if (!bHasWebServersDir)
  {
    UE_LOG(LogTemp, Error, TEXT("Not found ps servers."));
  }

  FString Args = TEXT("");
#if PLATFORM_WINDOWS
  OutScriptPath = OutScriptPath / TEXT("clear_node.bat");
#elif PLATFORM_LINUX
  OutScriptPath = OutScriptPath / TEXT("clear_node.sh");
#else
  UE_LOG(LogTemp, Error, TEXT("Unsupported platform for Pixel Streaming scripts."));
  // empty process
  return TSharedPtr<FMonitoredProcess>();
#endif

  return LaunchChildProcess(OutScriptPath, Args, FString(TEXT("Clear ps servers")), true /*bRunAsScript*/);
}

FString ServerUtils::ToString(FURL Url)
{
  return FString::Printf(TEXT("%s://%s:%d"), *(Url.Protocol), *(Url.Host), Url.Port);
}

FString ServerUtils::ToString(TArrayView<uint8> UTF8Bytes)
{
  FUTF8ToTCHAR Converted((const ANSICHAR*)UTF8Bytes.GetData(), UTF8Bytes.Num());
  FString OutString(Converted.Length(), Converted.Get());
  return OutString;
}

FString ServerUtils::ToString(TSharedRef<FJsonObject> JSONObj)
{
  FString Res;
  auto JsonWriter = TJsonWriterFactory<TCHAR, TCondensedJsonPrintPolicy<TCHAR>>::Create(&Res);
  bool bSerialized = FJsonSerializer::Serialize(JSONObj, JsonWriter);
  if(!bSerialized)
  {
    UE_LOG(LogTemp, Error, TEXT("Failed to stringify JSON object."));
  }
  return Res;
}

bool ServerUtils::Jsonify(FString InJSONString, TSharedPtr<FJsonObject>& OutJSON)
{
  const auto JsonReader = TJsonReaderFactory<TCHAR>::Create(InJSONString);
  return FJsonSerializer::Deserialize(JsonReader, OutJSON);
}
