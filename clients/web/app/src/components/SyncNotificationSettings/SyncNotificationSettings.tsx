import React, { useCallback, useEffect } from 'react'

import { Mute } from '@notification-service/types'
import isEqual from 'lodash/isEqual'
import { dlogger } from '@river-build/dlog'
import { UserSettings, useNotificationSettings } from 'hooks/useNotificationSettings'
import { useStore } from 'store/store'
import { useSaveNotificationSettings } from 'api/lib/notificationSettings'

const log = dlogger('app:SyncNotificationSettings')

export const SyncNotificationSettings = () => {
    const { mutate: mutateNotificationSettings } = useSaveNotificationSettings()
    const onUserSettingsChanged = useCallback(
        (userSettings: UserSettings) => {
            mutateNotificationSettings({
                userSettings,
            })
        },
        [mutateNotificationSettings],
    )
    const { spaceSettings, channelSettings } = useNotificationSettings(onUserSettingsChanged)

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

        useStore.setState((prev) => {
            if (isEqual(mutedChannelIds, prev['mutedChannelIds'])) {
                return prev
            }
            log.info('mutedChannelIds changed', mutedChannelIds)
            return { ...prev, ['mutedChannelIds']: mutedChannelIds }
        })
    }, [channelSettings, spaceSettings])

    return <></>
}
