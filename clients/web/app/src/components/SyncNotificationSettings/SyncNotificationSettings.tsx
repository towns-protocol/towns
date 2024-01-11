import React, { useEffect } from 'react'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'
import { useStore } from 'store/store'

export const SyncNotificationSettings = () => {
    const { data } = useGetNotificationSettings()
    useEffect(() => {
        const muteSpaceIds =
            data?.spaceSettings.reduce((acc, curr) => {
                if (curr.spaceMute) {
                    acc.push(curr.spaceId)
                }
                return acc
            }, [] as string[]) ?? []

        const mutedChannelIds =
            data?.channelSettings.reduce((acc, curr) => {
                if (curr.channelMute || muteSpaceIds.includes(curr.spaceId)) {
                    acc.push(curr.channelId)
                }
                return acc
            }, [] as string[]) ?? []

        useStore.setState({ mutedChannelIds })
    }, [data])

    return <></>
}
