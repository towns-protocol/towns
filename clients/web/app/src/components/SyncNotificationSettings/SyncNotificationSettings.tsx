import React, { useEffect } from 'react'

import { Mute } from '@notification-service/types'
import isEqual from 'lodash/isEqual'
import { dlogger } from '@river-build/dlog'
import { AxiosError, HttpStatusCode } from 'axios'
import { useMyUserId } from 'use-towns-client'
import { useStore } from 'store/store'
import { useNotificationSettings } from 'hooks/useNotificationSettings'

const log = dlogger('app:SyncNotificationSettings')

export const SyncNotificationSettings = () => {
    const myUserId = useMyUserId()
    const {
        channelSettings,
        spaceSettings,
        isLoadingNotificationSettings,
        getNotificationSettingsError,
        addUserNotificationSettings,
    } = useNotificationSettings()

    useEffect(() => {
        if (isLoadingNotificationSettings || !getNotificationSettingsError || !myUserId) {
            return
        }
        // if the user's notification settings are not found, create new settings
        if (
            getNotificationSettingsError instanceof AxiosError &&
            getNotificationSettingsError.response?.status === HttpStatusCode.NotFound
        ) {
            addUserNotificationSettings()
        }
    }, [
        getNotificationSettingsError,
        isLoadingNotificationSettings,
        myUserId,
        addUserNotificationSettings,
    ])

    // cache the muted channel ids locally
    useEffect(() => {
        if (isLoadingNotificationSettings || !channelSettings || !spaceSettings) {
            return
        }
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
            mutedChannelIds = Object.values(channelSettings)
                .reduce((acc, curr) => {
                    if (curr.channelMute == Mute.Muted || muteSpaceIds.includes(curr.spaceId)) {
                        acc.push(curr.channelId)
                    }
                    return acc
                }, [] as string[])
                .sort()
        }

        useStore.setState((prev) => {
            if (isEqual(mutedChannelIds, prev['mutedChannelIds'])) {
                return prev
            }
            log.info('mutedChannelIds changed', mutedChannelIds)
            return { ...prev, ['mutedChannelIds']: mutedChannelIds }
        })
    }, [channelSettings, isLoadingNotificationSettings, spaceSettings])

    return <></>
}
