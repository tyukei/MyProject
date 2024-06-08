// Copyright Epic Games, Inc. All Rights Reserved.

#pragma once

#include "CoreMinimal.h"
#include "GenericPlatform/GenericPlatformMisc.h"
#include "Containers/Map.h"
#include "Engine/EngineBaseTypes.h"
#include "HAL/ThreadSafeBool.h"
#include "Misc/MonitoredProcess.h"

/**
	* Configuration to control behaviour when launching any of the Pixel Streaming servers.
	**/
struct PIXELSTREAMINGEXTSERVERS_API FLaunchArgs
{
	// Arguments passed to the actual server when its process is started.
	FString ProcessArgs = TEXT("");

	// If true poll until ready
	bool bPollUntilReady = false;

	// Reconnection timeout in seconds
	float ReconnectionTimeoutSeconds = 30.0f;

	// Reconnect interval in seconds.
	float ReconnectionIntervalSeconds = 2.0f;

	// Path the server binary to run instead of launching server by running scripts
	TOptional<FString> ServerBinaryOverridePath;
};

/**
	* Endpoints for the various Pixel Streaming servers.
	**/
enum class PIXELSTREAMINGEXTSERVERS_API EEndpoint
{
	// The websocket signalling url between the server and the UE streamer - e.g. ws://localhost:8888
	Signalling_Streamer,

	// The websocket signalling url between the server and the players (aka. web browsers) - e.g. ws://localhost:80
	Signalling_Players,

	// The websocket signalling url between the server and the matchmaker server - e.g. ws://localhost:9999
	Signalling_Matchmaker,

	// The websocket signalling url between the server and the SFU server - e.g. ws://localhost:8889
	Signalling_SFU,

	// The http url for the webserver hosted within the signalling server - e.g. http://localhost
	Signalling_Webserver
};

// ---------------------------------------------------------------------------------------------
typedef TMap<EEndpoint, FURL> FEndpoints;
DECLARE_MULTICAST_DELEGATE_OneParam(FOnReady, const FEndpoints& /* Endpoint urls */);
// ---------------------------------------------------------------------------------------------


class PIXELSTREAMINGEXTSERVERS_API IServer
{
public:
	virtual ~IServer() = default;

	/* Immediately stops the server. */
	virtual void Stop() = 0;

	/**
		* @return	The absolute path to the root directory that the server was launched from.
		**/
	virtual FString GetPathOnDisk() = 0;

	/**
		* @return	True if the server has been launched. Note: Launched does not necessarily mean it is connectible yet. Bind to OnReady for that.
		**/
	virtual bool HasLaunched() = 0;

	/**
		* Launch the server in a child process using the supplied launch arguments.
		* @param LaunchArgs	The launch arguments to control how the server is launched, including what args to pass to the child process.
		* @return True if the server was able to start launching, this can fail when launching child process servers where files must exist on disk.
		**/
	virtual bool Launch(FLaunchArgs& InLaunchArgs) = 0;

	/**
		* @return	True if the server has been connected to and is ready for new connections.
		**/
	virtual bool IsReady() = 0;

	/**
		* @return	True if the server has timed out while trying to establish a connection.
		**/
	virtual bool IsTimedOut() = 0;

public:
	// Delegate fired when the server is ready for connections, first parameter is a map of all supported endpoints and their urls.
	FOnReady OnReady;

	DECLARE_MULTICAST_DELEGATE(FOnFailedToReady);
	/* Can fire when the server is unable to be contacted or connecting to it timed out. */
	FOnFailedToReady OnFailedToReady;
};


class PIXELSTREAMINGEXTSERVERS_API FPixelStreamingExtServers
{
public:
	static TSharedPtr<IServer> MakeCirrusServer();
	static TSharedPtr<IServer> MakeSFUServer();
	static TSharedPtr<IServer> MakeFrontEndServer();
	static TSharedPtr<FMonitoredProcess> DownloadPixelStreamingServers();
	static TSharedPtr<FMonitoredProcess> DeletePixelStreamingServers();
};
