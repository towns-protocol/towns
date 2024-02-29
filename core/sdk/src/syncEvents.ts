// todo: remove sync events once the sync loop is stable, and we don't need to debug it.
export type SyncEvents = {
    syncing: (syncId: string) => void
    syncCanceling: (syncId: string) => void
    syncError: (syncId: string, error: unknown) => void
    syncRetrying: (retryDelay: number) => void
    syncStarting: () => void
    syncStopped: () => void
}
