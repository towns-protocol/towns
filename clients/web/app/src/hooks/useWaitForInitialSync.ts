import { useZionContext } from 'use-zion-client'
import { useRetryUntilResolved } from './useRetryUntilResolved'

// When an initial sync isn't complete, it can cause a lot of undesirable UX or misleading error states
// Note that waiting for initial sync does not guarantee that what your waiting on will be synced (e.g. all the channels for a space are synced)
// BUT it can be helpful especially for initial loads of the app on direct links
export const useWaitForInitialSync = (interval = 500) => {
    const { casablancaClient } = useZionContext()
    return useRetryUntilResolved(() => {
        return casablancaClient !== undefined
    }, interval)
}
