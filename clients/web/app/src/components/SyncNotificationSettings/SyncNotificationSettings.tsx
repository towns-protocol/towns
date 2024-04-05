import React, { useEffect } from 'react'

import { Mute } from '@notification-service/types'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useStore } from 'store/store'
import { useUpdateNotificationSettings } from 'api/lib/notificationSettings'

export const SyncNotificationSettings = () => {
    const { mutate: mutateNotificationSettings } = useUpdateNotificationSettings()
    const { spaceSettings, channelSettings } = useNotificationSettings((userSettings) => {
        mutateNotificationSettings({
            userSettings,
        })
    })

    // cache the muted channel ids locally
    useEffect(() => {
        let muteSpaceIds: string[] = []
        if (spaceSettings) {
            muteSpaceIds = Object.values(spaceSettings).reduce((acc, curr) => {
                if (curr.spaceMute == Mute.Muted) {
                    acc.push(curr.spaceId)
                }
                return acc
            }, [] as string[])
        }

        let mutedChannelIds: string[] = []
        if (channelSettings) {
            mutedChannelIds = Object.values(channelSettings).reduce((acc, curr) => {
                if (curr.channelMute == Mute.Muted || muteSpaceIds.includes(curr.spaceId)) {
                    acc.push(curr.channelId)
                }
                return acc
            }, [] as string[])
        }

        useStore.setState({ mutedChannelIds })
    }, [channelSettings, spaceSettings])

    return <></>
}
