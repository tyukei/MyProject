#if WITH_EDITOR
#include "PixelStreamingExtEditorSettings.h"

#include UE_INLINE_GENERATED_CPP_BY_NAME(PixelStreamingExtEditorSettings)

//////////////////////////////////////////////////////////////////////////
// UPixelStreamingExtEditorSettings

UPixelStreamingExtEditorSettings::UPixelStreamingExtEditorSettings(const FObjectInitializer& ObjectInitializer)
        : Super(ObjectInitializer)
		, bExportWebServers(false)
{
}

void UPixelStreamingExtEditorSettings::PostInitProperties()
{
	Super::PostInitProperties();
}
#endif
