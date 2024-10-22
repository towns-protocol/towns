import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useMyProfile } from 'use-towns-client'
import {
    GetUserSettingsSchema,
    Mute,
    PatchUserSettingsSchema,
    SaveUserSettingsSchema,
} from '@notification-service/types'
import { useMemo } from 'react'
import { debug } from 'debug'
import axios from 'axios'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'
import { MINUTE_MS } from 'data/constants'

const PUSH_WORKER_URL = env.VITE_WEB_PUSH_WORKER_URL
// add localStoreage.debug=app:notification-settings to enable logging
const log = debug('app:notification-settings')
log.enabled = localStorage.getItem('debug')?.includes('app:notification-settings') ?? false

export const notificationSettingsQueryKeys = {
    getSettings: (userId: string | undefined) => ['getSettings', userId],
}

type UserSettings = SaveUserSettingsSchema['userSettings']
const zSettingsData: z.ZodType<UserSettings> = z.object({
    userId: z.string(),
    channelSettings: z.array(
        z.object({
            channelId: z.string(),
            spaceId: z.string(),
            channelMute: z.nativeEnum(Mute),
        }),
    ),
    spaceSettings: z.array(
        z.object({
            spaceId: z.string(),
            spaceMute: z.nativeEnum(Mute),
        }),
    ),
    replyTo: z.boolean(),
    mention: z.boolean(),
    directMessage: z.boolean(),
    blockedUsers: z.array(z.string()),
})

export function createDefaultUserSettings(userId: string): UserSettings {
    return {
        userId,
        channelSettings: [],
        spaceSettings: [],
        replyTo: true,
        mention: true,
        directMessage: true,
        blockedUsers: [],
    }
}

async function getSettings({ userId }: Partial<GetUserSettingsSchema>): Promise<UserSettings> {
    const url = `${PUSH_WORKER_URL}/api/get-notification-settings`
    if (!userId) {
        throw new Error('userId is required')
    }

    let userSettings = createDefaultUserSettings(userId)
    const response = await axiosClient.post(url, {
        userId,
    })
    const parseResult = zSettingsData.safeParse(response.data)

    if (!parseResult.success) {
        console.error('[getSettings] error parsing settings', parseResult.error)
        throw new Error(`Error parsing GetSettingsRequestParams in ${url}:: ${parseResult.error}`)
    }

    userSettings = parseResult.data
    return userSettings
}

export function toggleMuteSetting(mute: Mute | undefined) {
    return mute === Mute.Muted ? Mute.Unmuted : Mute.Muted
}

export function useMutedStreamIds() {
    const { data } = useGetNotificationSettings()
    const mutedStreamIds = useMemo(() => {
        if (!data) {
            return new Set<string>()
        }
        const mutedChannelIds = data.channelSettings
            .filter((c) => c.channelMute === Mute.Muted)
            .map((c) => c.channelId)
        const mutedSpaceIds = data.spaceSettings
            .filter((s) => s.spaceMute === Mute.Muted)
            .map((s) => s.spaceId)

        return new Set([...mutedChannelIds, ...mutedSpaceIds])
    }, [data])
    return { mutedStreamIds }
}

export function useMuteSettings({
    spaceId,
    channelId,
}: {
    spaceId: string | undefined
    channelId?: string | undefined
}) {
    const { data } = useGetNotificationSettings()
    const channelMuteSetting = data?.channelSettings.find(
        (s) => s.channelId === channelId,
    )?.channelMute
    const spaceMuteSetting = data?.spaceSettings.find((s) => s.spaceId === spaceId)?.spaceMute
    return {
        channelIsMuted: channelMuteSetting === Mute.Muted,
        spaceIsMuted: spaceMuteSetting === Mute.Muted,
        channelMuteSetting,
        spaceMuteSetting,
    }
}

export function useGetNotificationSettings() {
    const userId = useMyProfile()?.userId
    return useQuery({
        queryKey: notificationSettingsQueryKeys.getSettings(userId),
        queryFn: () => getSettings({ userId }),
        enabled: !!userId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        staleTime: 7 * MINUTE_MS,
    })
}

async function saveUserNotificationSettings({ userSettings }: SaveUserSettingsSchema) {
    const url = `${PUSH_WORKER_URL}/api/notification-settings`
    const response = await axiosClient.put(url, {
        userSettings,
    })
    log('[saveUserNotificationSettings] settings saved')
    return response.data
}

export async function patchNotificationSettings({ userSettings }: PatchUserSettingsSchema) {
    const url = `${PUSH_WORKER_URL}/api/notification-settings`
    const response = await axiosClient.patch(url, {
        userSettings,
    })
    log('[patchNotificationSettings] settings updated')
    return response.data
}

export function useSaveNotificationSettings() {
    const userId = useMyProfile()?.userId
    const queryClient = useQueryClient()

    return useMutation({
        retryDelay: retryDelayFn,
        retry: retryFn,
        mutationFn: async ({ userSettings }: SaveUserSettingsSchema) => {
            return saveUserNotificationSettings({ userSettings })
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({
                queryKey: notificationSettingsQueryKeys.getSettings(userId),
            })
        },
        onError: (error: unknown) => {
            console.error('[useSetNotificationSettings] error', error)
        },
    })
}

export function usePatchNotificationSettings() {
    const userId = useMyProfile()?.userId
    const queryClient = useQueryClient()

    return useMutation({
        retryDelay: retryDelayFn,
        retry: retryFn,
        mutationFn: async ({ userSettings }: PatchUserSettingsSchema) => {
            return patchNotificationSettings({ userSettings })
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({
                queryKey: notificationSettingsQueryKeys.getSettings(userId),
            })
        },
        onError: (error: unknown) => {
            console.error('[useSetNotificationSettings] error', error)
        },
    })
}

/**
 *
 * @returns mutate function to set a space or channel notification setting. If a channelId is passed, it will set the channel setting. If no channelId is passed, it will set the space setting.
 */
export function useSetMuteSettingForChannelOrSpace() {
    const userId = useMyProfile()?.userId
    const queryClient = useQueryClient()

    return useMutation({
        retryDelay: retryDelayFn,
        retry: retryFn,
        mutationFn: async ({
            spaceId,
            channelId,
            muteSetting,
        }: {
            spaceId: string
            channelId?: string
            muteSetting: Mute
        }) => {
            if (!userId) {
                return null
            }
            const notificationSettings = await queryClient.fetchQuery({
                queryKey: notificationSettingsQueryKeys.getSettings(userId),
                queryFn: () => getSettings({ userId }),
            })

            // user is toggling the space
            if (!channelId) {
                const matchedSpaceIndex = notificationSettings.spaceSettings.findIndex(
                    (s) => s.spaceId === spaceId,
                )

                const newSpaceSettings = {
                    spaceId,
                    spaceMute: muteSetting,
                }

                if (matchedSpaceIndex === -1) {
                    notificationSettings.spaceSettings.push(newSpaceSettings)
                } else {
                    notificationSettings.spaceSettings[matchedSpaceIndex] = newSpaceSettings
                }
            }
            // user is toggling a channel
            else {
                const matchedChannelIndex = notificationSettings.channelSettings.findIndex(
                    (channel) => channel.channelId === channelId,
                )
                const newChannelSettings = {
                    channelId,
                    spaceId,
                    channelMute: muteSetting,
                }

                if (matchedChannelIndex === -1) {
                    notificationSettings.channelSettings.push(newChannelSettings)
                } else {
                    notificationSettings.channelSettings[matchedChannelIndex] = newChannelSettings
                }
            }

            log('[useSetNotificationSettings]', 'saving to cloud', notificationSettings)
            return saveUserNotificationSettings({ userSettings: notificationSettings })
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({
                queryKey: notificationSettingsQueryKeys.getSettings(userId),
            })
        },
        onError: (error: unknown) => {
            console.error('[useSetNotificationSettings] error', error)
        },
    })
}

function retryFn(failureCount: number, error: unknown): boolean {
    // Check if the error is an AxiosError
    if (axios.isAxiosError(error)) {
        // Retry logic based on the error and failure count
        if (error.response?.status === 500 || error.message === 'Network Error') {
            return failureCount <= 3 // Retry up to 3 times
        }
    }
    return false //
}

function retryDelayFn(failureCount: number): number {
    // Exponential backoff: Delay = 1000ms * 2^failureCount (up to a max of 30 seconds)
    return Math.min(1000 * 2 ** failureCount, 30000) // Max delay of 30 seconds
}
