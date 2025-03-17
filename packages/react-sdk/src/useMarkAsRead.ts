import { type UserReadMarker } from '@river-build/sdk'
import { useSyncAgent } from './useSyncAgent'
import { type ActionConfig, useAction } from './internals/useAction'

export const useMarkAsRead = (config?: ActionConfig<UserReadMarker['markAsRead']>) => {
    const sync = useSyncAgent()
    const { action, ...rest } = useAction(sync.user.settings.readMarker, 'markAsRead')
    return {
        markAsRead: action,
        ...rest,
    }
}
