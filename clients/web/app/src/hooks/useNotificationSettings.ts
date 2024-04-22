import { Mute, SaveUserSettingsSchema } from '@notification-service/types'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMyProfile, useTownsContext } from 'use-towns-client'
import {
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    isSpaceStreamId,
} from '@river/sdk'
import { isEqual } from 'lodash'
import { useGetNotificationSettings } from 'api/lib/notificationSettings'
import { SECOND_MS } from 'data/constants'

type UserSettingsSpace = SaveUserSettingsSchema['userSettings']['spaceSettings'][0]
type UserSettingsChannel = SaveUserSettingsSchema['userSettings']['channelSettings'][0]

interface SpaceSettings {
    [spaceId: string]: UserSettingsSpace
}

interface ChannelSettings {
    [channelId: string]: UserSettingsChannel
}

interface DebouncedEffectProps {
    compareFn: (a: unknown, b: unknown) => boolean
    newValue: unknown
    currentValue: unknown
    onChange: (value: unknown) => void
}

export function useNotificationSettings(
    onSettingsUpdated?: (settings: SaveUserSettingsSchema['userSettings']) => void,
) {
    const {
        dmChannels: tcDmChannels,
        rooms: tcRooms,
        spaceHierarchies: tcSpaceHierarchies,
    } = useTownsContext()
    const userId = useMyProfile()?.userId
    const { data, isLoading } = useGetNotificationSettings()
    const [settingsUpdated, setSettingsUpdated] = useState(false)
    const [rooms, setRooms] = useState(tcRooms)
    const [dmChannels, setDmChannels] = useState(tcDmChannels)
    const [spaceHierarchies, setSpaceHierarchies] = useState(tcSpaceHierarchies)

    const debounceTimeout = useRef<NodeJS.Timeout | undefined>(undefined)
    const onSettingsUpdatedTimeout = useRef<NodeJS.Timeout | undefined>(undefined)

    function useDebouncedEffect(props: DebouncedEffectProps) {
        useEffect(() => {
            if (!props.compareFn(props.newValue, props.currentValue)) {
                if (debounceTimeout.current) {
                    clearTimeout(debounceTimeout.current)
                }

                debounceTimeout.current = setTimeout(() => {
                    props.onChange(props.newValue)
                }, SECOND_MS)
            }
            return () => {
                if (debounceTimeout.current) {
                    clearTimeout(debounceTimeout.current)
                }
            }
        }, [props])
    }

    function onTownsContextDataChange() {
        setRooms(tcRooms)
        setDmChannels(tcDmChannels)
        setSpaceHierarchies(tcSpaceHierarchies)
    }

    useDebouncedEffect({
        compareFn: isEqual,
        newValue: tcRooms,
        currentValue: rooms,
        onChange: onTownsContextDataChange,
    })
    useDebouncedEffect({
        compareFn: isEqual,
        newValue: tcDmChannels,
        currentValue: dmChannels,
        onChange: onTownsContextDataChange,
    })
    useDebouncedEffect({
        compareFn: isEqual,
        newValue: tcSpaceHierarchies,
        currentValue: spaceHierarchies,
        onChange: onTownsContextDataChange,
    })

    const savedSpaceSettings = useMemo(() => {
        let spaceSettings: SpaceSettings | undefined = undefined
        if (!isLoading && data?.spaceSettings) {
            spaceSettings = {}
            for (const s of data.spaceSettings) {
                if (isSpaceStreamId(s.spaceId) && rooms[s.spaceId]) {
                    spaceSettings[s.spaceId] = s
                }
            }
        }
        return spaceSettings
    }, [data?.spaceSettings, rooms, isLoading])

    const savedChannelSettings = useMemo(() => {
        let channelSettings: ChannelSettings | undefined = undefined
        if (!isLoading && data?.channelSettings) {
            channelSettings = {}
            for (const c of data.channelSettings) {
                if (isSupportedNotificationChannel(c.channelId) && rooms[c.channelId]) {
                    channelSettings[c.channelId] = c
                }
            }
        }
        return channelSettings
    }, [data?.channelSettings, rooms, isLoading])

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
        let settingsIsUpdated = false

        let spaceSettings = savedSpaceSettings
        if (spaceSettings === undefined) {
            return spaceSettings
        }
        // add any missing space settings from the space hierarchies
        for (const s of Object.keys(spaceHierarchies)) {
            if (isSpaceStreamId(s)) {
                spaceSettings = spaceSettings ?? {}
                if (!spaceSettings[s]) {
                    settingsIsUpdated = true
                    // create a new copy
                    spaceSettings = { ...spaceSettings }
                    spaceSettings[s] = {
                        spaceId: s,
                        spaceMute: Mute.Default,
                    }
                }
            }
        }
        if (spaceSettings && removedSpaceSettings) {
            for (const s of removedSpaceSettings) {
                settingsIsUpdated = true
                delete spaceSettings[s]
            }
        }
        if (settingsIsUpdated) {
            setSettingsUpdated(true)
        }
        return spaceSettings
    }, [removedSpaceSettings, savedSpaceSettings, spaceHierarchies])

    const updatedChannelSettings = useMemo(() => {
        let channelSettings = savedChannelSettings
        if (channelSettings === undefined) {
            return channelSettings
        }

        let settingsIsUpdated = false
        // add any missing channel settings from the space hierarchies
        for (const s of Object.keys(spaceHierarchies)) {
            const space = spaceHierarchies[s]
            const channels = space.channels
            for (const c of channels) {
                if (isSupportedNotificationChannel(c.id)) {
                    channelSettings = channelSettings ?? {}
                    if (!channelSettings[c.id]) {
                        settingsIsUpdated = true
                        // create a new copy
                        channelSettings = { ...channelSettings }
                        channelSettings[c.id] = {
                            channelId: c.id,
                            spaceId: s,
                            channelMute: Mute.Default,
                        }
                    }
                }
            }
        }
        // add any missing dm channel settings
        for (const dm of dmChannels) {
            channelSettings = channelSettings ?? {}
            if (!channelSettings[dm.id]) {
                settingsIsUpdated = true
                // create a new copy
                channelSettings = { ...channelSettings }
                channelSettings[dm.id] = {
                    channelId: dm.id,
                    spaceId: '',
                    channelMute: Mute.Default,
                }
            }
        }
        if (channelSettings && removedChannelSettings) {
            for (const c of removedChannelSettings) {
                settingsIsUpdated = true
                delete channelSettings[c]
            }
        }
        if (settingsIsUpdated) {
            setSettingsUpdated(true)
        }

        return channelSettings
    }, [dmChannels, removedChannelSettings, savedChannelSettings, spaceHierarchies])

    useEffect(() => {
        if (
            settingsUpdated &&
            updatedSpaceSettings &&
            updatedChannelSettings &&
            userId &&
            onSettingsUpdated
        ) {
            if (onSettingsUpdatedTimeout.current) {
                clearTimeout(onSettingsUpdatedTimeout.current)
            }

            onSettingsUpdatedTimeout.current = setTimeout(() => {
                console.log('useNotificationSettings', 'onSettingsUpdated', onSettingsUpdated)
                onSettingsUpdated({
                    userId,
                    directMessage: data?.directMessage ?? true,
                    mention: data?.mention ?? true,
                    replyTo: data?.replyTo ?? true,
                    spaceSettings: updatedSpaceSettings ? Object.values(updatedSpaceSettings) : [],
                    channelSettings: updatedChannelSettings
                        ? Object.values(updatedChannelSettings)
                        : [],
                })
                setSettingsUpdated(false)
            }, SECOND_MS)

            return () => {
                if (onSettingsUpdatedTimeout.current) {
                    clearTimeout(onSettingsUpdatedTimeout.current)
                }
            }
        }
    }, [
        data,
        onSettingsUpdated,
        settingsUpdated,
        updatedChannelSettings,
        updatedSpaceSettings,
        userId,
    ])

    return {
        settingsUpdated,
        directMessage: data?.directMessage ?? true,
        mention: data?.mention ?? true,
        replyTo: data?.replyTo ?? true,
        spaceSettings: updatedSpaceSettings,
        channelSettings: updatedChannelSettings,
        isLoading,
    }
}

function isSupportedNotificationChannel(streamId: string): boolean {
    return (
        isDMChannelStreamId(streamId) ||
        isGDMChannelStreamId(streamId) ||
        isChannelStreamId(streamId)
    )
}
