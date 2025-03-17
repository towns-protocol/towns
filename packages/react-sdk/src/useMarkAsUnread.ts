import { type UserReadMarker } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ActionConfig, useAction } from './internals/useAction'

export const useMarkAsUnread = (config?: ActionConfig<UserReadMarker['markAsUnread']>) => {
    const sync = useSyncAgent()
    const { action, ...rest } = useAction(sync.user.settings.readMarker, 'markAsUnread', config)
    return {
        markAsUnread: action,
        ...rest,
    }
}
