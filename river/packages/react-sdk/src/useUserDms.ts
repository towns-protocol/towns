import type { Dms } from '@river-build/sdk'
import type { ObservableConfig } from './useObservable'
import { useRiver } from './useRiver'

export const useUserDms = (config?: ObservableConfig.FromObservable<Dms>) => {
    const { data, ...rest } = useRiver((s) => s.dms, config)
    return { streamIds: data.streamIds, ...rest }
}
