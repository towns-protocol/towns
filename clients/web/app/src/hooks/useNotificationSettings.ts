import { Mute, UserSettingsChannel, UserSettingsSpace } from '@push-notification-worker/types'

import { useMemo, useState } from 'react'
import { useTownsContext } from 'use-towns-client'
import {
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
} from '@river/sdk'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'

interface SpaceSettings {
    [spaceId: string]: UserSettingsSpace
}

interface ChannelSettings {
    [channelId: string]: UserSettingsChannel
}

export function useNotificationSettings() {
    const { dmChannels, rooms, spaceHierarchies } = useTownsContext()
    const { data } = useGetNotificationSettings()
    const [settingsUpdated, setSettingsUpdated] = useState(false)

    const savedSpaceSettings = useMemo(() => {
        let spaceSettings: SpaceSettings | undefined = undefined
        if (data?.spaceSettings && data.spaceSettings.length > 0) {
            spaceSettings = {}
            for (const s of data.spaceSettings) {
                if (isSpaceStreamId(s.spaceId) && rooms[s.spaceId]) {
                    spaceSettings[s.spaceId] = s
                }
            }
        }
        return spaceSettings
    }, [data?.spaceSettings, rooms])

    const savedChannelSettings = useMemo(() => {
        let channelSettings: ChannelSettings | undefined = undefined
        if (data?.channelSettings && data.channelSettings.length > 0) {
            channelSettings = {}
            for (const c of data.channelSettings) {
                if (isSupportedNotificationChannel(c.channelId) && rooms[c.channelId]) {
                    channelSettings[c.channelId] = c
                }
            }
        }
        return channelSettings
    }, [data?.channelSettings, rooms])

    const removedSpaceSettings = useMemo(() => {
        let removedSpaceSettings: string[] = []
        if (savedSpaceSettings) {
            removedSpaceSettings = Object.keys(savedSpaceSettings).filter(
                (s) => !spaceHierarchies[s],
            )
        }
        return removedSpaceSettings.length > 0 ? removedSpaceSettings : undefined
    }, [savedSpaceSettings, spaceHierarchies])

    const removedChannelSettings = useMemo(() => {
        let removedChannelSettings: string[] = []
        if (savedChannelSettings) {
            removedChannelSettings = Object.keys(savedChannelSettings).filter(
                (c) => !rooms[c] && !dmChannels.find((dm) => dm.id === c),
            )
        }
        return removedChannelSettings.length > 0 ? removedChannelSettings : undefined
    }, [dmChannels, rooms, savedChannelSettings])

    const updatedSpaceSettings = useMemo(() => {
        let spaceSettings = savedSpaceSettings
        // add any missing space settings from the space hierarchies
        for (const s of Object.keys(spaceHierarchies)) {
            if (isSpaceStreamId(s)) {
                spaceSettings = spaceSettings ?? {}
                if (!spaceSettings[s]) {
                    setSettingsUpdated(true)
                    // create a new copy
                    spaceSettings = { ...spaceSettings }
                    spaceSettings[s] = {
                        spaceId: s,
                        spaceMute: Mute.Default,
                    }
                    console.log('useNotificationSettings', 'added space notification settings', s)
                }
            }
        }
        if (spaceSettings && removedSpaceSettings) {
            for (const s of removedSpaceSettings) {
                setSettingsUpdated(true)
                delete spaceSettings[s]
                console.log('useNotificationSettings', 'removed space notification settings', s)
            }
        }
        return spaceSettings
    }, [removedSpaceSettings, savedSpaceSettings, spaceHierarchies])

    const updatedChannelSettings = useMemo(() => {
        let channelSettings = savedChannelSettings
        // add any missing channel settings from the space hierarchies
        for (const s of Object.keys(spaceHierarchies)) {
            const space = spaceHierarchies[s]
            const channels = space.channels
            for (const c of channels) {
                if (isSupportedNotificationChannel(c.id)) {
                    channelSettings = channelSettings ?? {}
                    if (!channelSettings[c.id]) {
                        setSettingsUpdated(true)
                        // create a new copy
                        channelSettings = { ...channelSettings }
                        channelSettings[c.id] = {
                            channelId: c.id,
                            spaceId: s,
                            channelMute: Mute.Default,
                        }
                        console.log(
                            'useNotificationSettings',
                            'added channel notification settings',
                            c.id,
                        )
                    }
                }
            }
        }
        // add any missing dm channel settings
        for (const dm of dmChannels) {
            channelSettings = channelSettings ?? {}
            if (!channelSettings[dm.id]) {
                setSettingsUpdated(true)
                // create a new copy
                channelSettings = { ...channelSettings }
                channelSettings[dm.id] = {
                    channelId: dm.id,
                    spaceId: '',
                    channelMute: Mute.Default,
                }
                console.log(
                    'useNotificationSettings',
                    'added dm channel notification settings',
                    dm.id,
                )
            }
        }
        if (channelSettings && removedChannelSettings) {
            for (const c of removedChannelSettings) {
                setSettingsUpdated(true)
                delete channelSettings[c]
                console.log('useNotificationSettings', 'removed channel notification settings', c)
            }
        }
        return channelSettings
    }, [dmChannels, removedChannelSettings, savedChannelSettings, spaceHierarchies])

    return {
        settingsUpdated,
        directMessage: data?.directMessage ?? true,
        mention: data?.mention ?? true,
        replyTo: data?.replyTo ?? true,
        spaceSettings: updatedSpaceSettings,
        channelSettings: updatedChannelSettings,
    }
}

function isSupportedNotificationChannel(streamId: string): boolean {
    return (
        isDMChannelStreamId(streamId) ||
        isGDMChannelStreamId(streamId) ||
        isChannelStreamId(streamId)
    )
}
