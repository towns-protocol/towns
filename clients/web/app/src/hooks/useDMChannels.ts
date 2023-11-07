import { useMemo } from 'react'
import { Channel, useZionContext } from 'use-zion-client'

export const useDmChannels = (): Channel[] => {
    const { dmChannels } = useZionContext()
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
