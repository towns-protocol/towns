import { useMemo } from 'react'
import { useTownsContext } from 'use-towns-client'

export const useRecentUsers = (userId?: string) => {
    const { dmChannels } = useTownsContext()
    return useMemo(() => {
        return dmChannels.reduce((acc, channel) => {
            if (acc.length >= 10) {
                return acc
            }
            channel.userIds.forEach((id) => {
                if (id !== userId && !acc.includes(id)) {
                    acc.push(id)
                }
            })
            return acc
        }, [] as string[])
    }, [dmChannels, userId])
}
