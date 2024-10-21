import type { Gdms } from '@river-build/sdk/dist/sync-agent/gdms/gdms'
import type { ObservableConfig } from './useObservable'
import { useRiver } from './useRiver'

export const useUserGdms = (config?: ObservableConfig.FromObservable<Gdms>) => {
    const { data, ...rest } = useRiver((s) => s.gdms, config)
    return { streamIds: data.streamIds, ...rest }
}
