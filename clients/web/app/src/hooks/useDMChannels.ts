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
                } satisfies Channel
            }),
        [dmChannels],
    )
    return channels
}
