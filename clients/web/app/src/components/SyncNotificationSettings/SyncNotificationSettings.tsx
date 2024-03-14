import React, { useEffect } from 'react'

import { useQueryClient } from 'wagmi'
import { useMyProfile } from 'use-towns-client'
import { useNotificationSettings } from 'hooks/useNotificationSettings'
import { useStore } from 'store/store'
import { notificationSettingsQueryKeys, putSettings } from 'api/lib/notificationSettings'

export const SyncNotificationSettings = () => {
    const userId = useMyProfile()?.userId
    const queryClient = useQueryClient()
    const { settingsUpdated, spaceSettings, channelSettings, directMessage, replyTo, mention } =
        useNotificationSettings()

    // cache the muted channel ids locally
    useEffect(() => {
        let muteSpaceIds: string[] = []
        if (spaceSettings) {
            muteSpaceIds = Object.values(spaceSettings).reduce((acc, curr) => {
                if (curr.spaceMute) {
                    acc.push(curr.spaceId)
                }
                return acc
            }, [] as string[])
        }

        let mutedChannelIds: string[] = []
        if (channelSettings) {
            mutedChannelIds = Object.values(channelSettings).reduce((acc, curr) => {
                if (curr.channelMute || muteSpaceIds.includes(curr.spaceId)) {
                    acc.push(curr.channelId)
                }
                return acc
            }, [] as string[])
        }

        useStore.setState({ mutedChannelIds })
    }, [channelSettings, spaceSettings])

    // save the updated settings to the cloud
    useEffect(() => {
        if (userId && settingsUpdated) {
            console.log(
                '[SyncNotificationSettings]',
                'saving to cloud',
                'spaceSettings',
                spaceSettings,
                'channelSettings',
                channelSettings,
            )
            putSettings({
                userSettings: {
                    userId,
                    spaceSettings: spaceSettings ? Object.values(spaceSettings) : [],
                    channelSettings: channelSettings ? Object.values(channelSettings) : [],
                    replyTo,
                    mention,
                    directMessage,
                },
            })
                .then(() => {
                    const queryKey = notificationSettingsQueryKeys.getSettings(userId)
                    if (queryKey) {
                        queryClient.invalidateQueries(queryKey).catch((e) => {
                            console.error('Error invalidating notification settings query', e)
                        })
                    }
                })
                .catch((e) => {
                    console.error('Error saving notification settings', e)
                })
        }
    }, [
        channelSettings,
        directMessage,
        mention,
        queryClient,
        replyTo,
        settingsUpdated,
        spaceSettings,
        userId,
    ])

    return <></>
}
