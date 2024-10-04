export enum AppProgressState {
    None = 'none',
    LoadingAssets = 'LoadingAssets',
    LoggingIn = 'LoggingIn',
    Joining = 'Joining',
    InitializingWorkspace = 'InitializingWorkspace',
    CreatingSpace = 'CreatingSpace',
    CreatingDM = 'CreatingDM',
    CreatingGDM = 'CreatingGDM',
}

export enum AppProgressOverlayKey {
    Logo = 'logo',
    Skeleton = 'skeleton',
    Animation = 'animation',
}

export enum AppStartupTrack {
    TownLogoShown = 'town_logo_shown',
    GlobeAnimationRunning = 'globe_animation_running',
    SkeletonShimmering = 'skeleton_shimmering',
    ContentLoaded = 'content_loaded',
}

export function toAppStartupTrack(key: AppProgressOverlayKey): AppStartupTrack | undefined {
    switch (key) {
        case AppProgressOverlayKey.Logo:
            return AppStartupTrack.TownLogoShown
        case AppProgressOverlayKey.Animation:
            return AppStartupTrack.GlobeAnimationRunning
        case AppProgressOverlayKey.Skeleton:
            return AppStartupTrack.SkeletonShimmering
        default:
            return undefined
    }
}
