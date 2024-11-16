import type { Spaces } from '@river-build/sdk'
import type { ObservableConfig } from './useObservable'
import { useRiver } from './useRiver'

/**
 * Hook to get the spaces of the current user.
 * @param config - Configuration options for the observable. @see {@link ObservableConfig.FromObservable}
 * @returns The spaces of the current user.
 */
export const useUserSpaces = (config?: ObservableConfig.FromObservable<Spaces>) => {
    const { data, ...rest } = useRiver((s) => s.spaces, config)
    return { spaceIds: data.spaceIds, ...rest }
}
