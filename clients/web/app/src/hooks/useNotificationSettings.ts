import { useCallback } from 'react'
import { Mute, PatchUserSettingsSchema, SaveUserSettingsSchema } from '@notification-service/types'
import { useMyUserId } from 'use-towns-client'
import { dlogger } from '@river-build/dlog'
import {
    createDefaultUserSettings,
    useGetNotificationSettings,
    usePatchNotificationSettings,
    useSaveNotificationSettings,
} from 'api/lib/notificationSettings'

const log = dlogger('app:useNotificationSettings')

export type UserSettings = SaveUserSettingsSchema['userSettings']

export interface AddChannelNotificationSettings {
    channelId: string
    spaceId?: string
}

export function useNotificationSettings() {
    const myUserId = useMyUserId()
    const {
        data,
        isLoading: isLoadingNotificationSettings,
        error: getNotificationSettingsError,
    } = useGetNotificationSettings()
    const notificationSettings: UserSettings | undefined = data
    const { blockedUsers, channelSettings, directMessage, mention, replyTo, spaceSettings } =
        notificationSettings || {}
    const { mutate: updateNotificationSettings, mutateAsync: updateNotificationSettingsAsync } =
        usePatchNotificationSettings()
    const {
        mutate: replaceAllNotificationSettings,
        mutateAsync: replaceAllNotificationSettingsAsync,
    } = useSaveNotificationSettings()

    const addUserNotificationSettings = useCallback(async () => {
        if (!myUserId) {
            return
        }
        const newSettings = {
            userSettings: createDefaultUserSettings(myUserId),
        }
        await replaceAllNotificationSettingsAsync(newSettings)
        log.info('created user notification settings', newSettings)
        return newSettings
    }, [myUserId, replaceAllNotificationSettingsAsync])

    const addTownNotificationSettings = useCallback(
        async (spaceId: string) => {
            if (myUserId && spaceSettings) {
                const isNewSpace = !spaceSettings.some((s) => s.spaceId === spaceId)
                const newSpaceSettings =
                    isNewSpace && spaceId
                        ? [
                              ...spaceSettings,
                              {
                                  spaceId,
                                  spaceMute: Mute.Default,
                              },
                          ]
                        : undefined
                if (newSpaceSettings) {
                    const newSettings: PatchUserSettingsSchema = {
                        userSettings: {
                            userId: myUserId,
                            spaceSettings: newSpaceSettings,
                        },
                    }
                    await updateNotificationSettingsAsync(newSettings)
                    log.info('added town notification settings', newSettings)
                }
            }
        },
        [myUserId, updateNotificationSettingsAsync, spaceSettings],
    )

    const addChannelNotificationSettings = useCallback(
        async ({ channelId, spaceId = '' }: AddChannelNotificationSettings) => {
            if (myUserId && spaceSettings && channelSettings) {
                const isNewSpace = !spaceSettings.some((s) => s.spaceId === spaceId)
                const newSpaceSettings =
                    isNewSpace && spaceId
                        ? [
                              ...spaceSettings,
                              {
                                  spaceId,
                                  spaceMute: Mute.Default,
                              },
                          ]
                        : undefined
                const isNewChannel = !channelSettings.some((c) => c.channelId === channelId)
                const newChannelSettings = isNewChannel
                    ? [...channelSettings, { channelId, spaceId, channelMute: Mute.Default }]
                    : undefined
                if (newSpaceSettings || newChannelSettings) {
                    const newSettings: PatchUserSettingsSchema = {
                        userSettings: {
                            userId: myUserId,
                        },
                    }
                    if (newSpaceSettings) {
                        newSettings.userSettings.spaceSettings = newSpaceSettings
                    }
                    if (newChannelSettings) {
                        newSettings.userSettings.channelSettings = newChannelSettings
                    }
                    await updateNotificationSettingsAsync(newSettings)
                    log.info('added channel notification settings', newSettings)
                }
            }
        },
        [channelSettings, myUserId, updateNotificationSettingsAsync, spaceSettings],
    )

    const addDmGdmNotificationSettings = useCallback(
        async (channelId: string) => {
            if (myUserId && channelSettings) {
                const isNewDmOrGdm = !channelSettings.some((c) => c.channelId === channelId)
                const newChannelSettings = isNewDmOrGdm
                    ? {
                          channelId,
                          spaceId: '',
                          channelMute: Mute.Default,
                      }
                    : undefined
                if (newChannelSettings) {
                    const newDmSettings: PatchUserSettingsSchema = {
                        userSettings: {
                            userId: myUserId,
                            channelSettings: [...channelSettings, newChannelSettings],
                        },
                    }
                    await updateNotificationSettingsAsync(newDmSettings)
                    log.info('added DM/GDM notification settings', newDmSettings)
                }
            }
        },
        [channelSettings, myUserId, updateNotificationSettingsAsync],
    )

    const removeTownNotificationSettings = useCallback(
        async (spaceId: string) => {
            if (myUserId && spaceSettings) {
                const changedSpaceSettings = spaceSettings.filter((s) => s.spaceId !== spaceId)
                const changedChannelSettings = channelSettings?.filter((c) => c.spaceId !== spaceId)
                const changedTownSettings: PatchUserSettingsSchema = {
                    userSettings: {
                        userId: myUserId,
                        spaceSettings: changedSpaceSettings,
                        channelSettings: changedChannelSettings,
                    },
                }
                await updateNotificationSettingsAsync(changedTownSettings)
                log.info('removed town notification settings', changedTownSettings)
            }
        },
        [channelSettings, myUserId, spaceSettings, updateNotificationSettingsAsync],
    )

    const removeChannelNotificationSettings = useCallback(
        async (channelId: string) => {
            if (myUserId && channelSettings) {
                const changedChannelSettings = channelSettings.filter(
                    (c) => c.channelId !== channelId,
                )
                const changedChannelSettingsSchema: PatchUserSettingsSchema = {
                    userSettings: {
                        userId: myUserId,
                        channelSettings: changedChannelSettings,
                    },
                }
                await updateNotificationSettingsAsync(changedChannelSettingsSchema)
                log.info('removed channel notification settings', changedChannelSettingsSchema)
            }
        },
        [channelSettings, myUserId, updateNotificationSettingsAsync],
    )

    return {
        blockedUsers,
        channelSettings,
        directMessage: directMessage ?? true,
        getNotificationSettingsError,
        isLoadingNotificationSettings,
        mention: mention ?? true,
        replyTo: replyTo ?? true,
        spaceSettings,
        addDmGdmNotificationSettings,
        addChannelNotificationSettings,
        addTownNotificationSettings,
        addUserNotificationSettings,
        updateNotificationSettings,
        updateNotificationSettingsAsync,
        replaceAllNotificationSettings,
        replaceAllNotificationSettingsAsync,
        removeChannelNotificationSettings,
        removeTownNotificationSettings,
    }
}
