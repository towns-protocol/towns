export type TownsAnalytics = {
    trackedEvents: Set<string>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    track: (event: string, props?: Record<string, any>, callback?: (data?: any) => void) => void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    trackOnce: (event: string, props?: Record<string, any>, callback?: (data?: any) => void) => void
}
