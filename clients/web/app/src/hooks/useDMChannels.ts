import { useMemo } from 'react'
import { Channel, useTownsContext } from 'use-towns-client'

export const useDmChannels = (): Channel[] => {
    const { dmChannels } = useTownsContext()
    const channels = useMemo(
        () =>
            dmChannels.map((c) => {
                return {
                    id: c.id,
                    label: '',
                    isAutojoin: false,
                    isDefault: false,
                    hideUserJoinLeaveEvents: false,
                    disabled: false,
                } satisfies Channel
            }),
        [dmChannels],
    )
    return channels
}
