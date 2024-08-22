import type { Spaces } from '@river-build/sdk'
import type { ObservableConfig } from './useObservable'
import { useRiver } from './useRiver'

export const useUserSpaces = (config?: ObservableConfig.FromObservable<Spaces>) => {
    const { data, ...rest } = useRiver((s) => s.spaces, config)
    return { spaceIds: data.spaceIds, ...rest }
}
