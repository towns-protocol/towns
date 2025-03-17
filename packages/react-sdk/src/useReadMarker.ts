import { type UserReadMarker } from '@river-build/sdk'
import { type ObservableConfig, useObservable } from './useObservable'
import { useSyncAgent } from './useSyncAgent'

export const useReadMarker = (config?: ObservableConfig.FromObservable<UserReadMarker>) => {
    const sync = useSyncAgent()
    const { data, ...rest } = useObservable(sync.user.settings.readMarker, config)
    return {
        markers: data.markers,
        ...rest,
    }
}
