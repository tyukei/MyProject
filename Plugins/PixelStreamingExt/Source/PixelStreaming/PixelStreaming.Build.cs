// Copyright Epic Games, Inc. All Rights Reserved.

using System.Collections.Generic;
using System.IO;

namespace UnrealBuildTool.Rules
{
	public class PixelStreaming : ModuleRules
	{
		public PixelStreaming(ReadOnlyTargetRules Target) : base(Target)
		{
			// This is so for game projects using our public headers don't have to include extra modules they might not know about.
			PublicDependencyModuleNames.AddRange(new string[]
			{
				"ApplicationCore",
				"InputDevice",
				"WebRTC",
				"PixelCapture",
				"PixelStreamingInput"
			});

			PrivateDependencyModuleNames.AddRange(new string[]
			{
				"Core",
				"CoreUObject",
				"Engine",
				"EngineSettings",
				"InputCore",
				"Json",
				"Renderer",
				"RenderCore",
				"RHI",
				"SignalProcessing",
				"Slate",
				"SlateCore",
				"AudioMixer",
				"WebRTC",
				"WebSockets",
				"Sockets",
				"MediaUtils",
				"DeveloperSettings",
				"AVCodecsCore",
				"AVCodecsCoreRHI",
				"PixelCaptureShaders",
				//"PixelStreamingServers",
				//"PixelStreamingHMD",
				"TraceLog",
				"HTTP",
				"NVML"
			});

			PrivateDefinitions.Add("PIXELSTREAMING_DUMP_ENCODING=0");

			PrivateDependencyModuleNames.Add("VulkanRHI");
			AddEngineThirdPartyPrivateStaticDependencies(Target, "Vulkan", "CUDA");

			if (Target.IsInPlatformGroup(UnrealPlatformGroup.Windows))
			{
				PrivateDependencyModuleNames.Add("D3D11RHI");
				PrivateDependencyModuleNames.Add("D3D12RHI");

				AddEngineThirdPartyPrivateStaticDependencies(Target, "DX11", "DX12");
			}

            AddEngineThirdPartyPrivateStaticDependencies(Target, "WebRTC", "OpenSSL", "libOpus");
        }
    }
}
