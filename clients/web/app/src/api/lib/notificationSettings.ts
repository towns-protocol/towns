import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useMyProfile } from 'use-zion-client'
import {
    GetSettingsRequestParams,
    SaveSettingsRequestParams,
} from '@push-notification-worker/request-interfaces'
import { Mute } from '@push-notification-worker/types'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'

const PUSH_WORKER_URL = env.VITE_WEB_PUSH_WORKER_URL
const queryKeys = {
    getSettings: (userId: string | undefined) => ['getSettings', userId],
}

type UserSettings = SaveSettingsRequestParams['userSettings']
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
})

async function getSettings({ userId }: Partial<GetSettingsRequestParams>): Promise<UserSettings> {
    const url = `${PUSH_WORKER_URL}/api/get-notification-settings`
    if (!userId) {
        throw new Error('userId is required')
    }

    let userSettings: UserSettings = {
        userId,
        channelSettings: [],
        spaceSettings: [],
        replyTo: true,
        mention: true,
        directMessage: true,
    }
    try {
        console.log('[getSettings] fetching settings', userId)
        const response = await axiosClient.post(url, {
            userId,
        })
        const parseResult = zSettingsData.safeParse(response.data)

        if (!parseResult.success) {
            console.error('[getSettings] error parsing settings', parseResult.error)
            throw new Error(
                `Error parsing GetSettingsRequestParams in ${url}:: ${parseResult.error}`,
            )
        }

        userSettings = parseResult.data
        console.log('[getSettings] settings fetched', userSettings)
    } catch (error) {
        console.error('[getSettings] error', error)
        // if the user's settings is not found, create a new one
        console.log('[getSettings] creating new settings')
        await putSettings({ userSettings })
    }
    return userSettings
}

export function toggleMuteSetting(mute: Mute | undefined) {
    return mute === Mute.Muted ? Mute.Unmuted : Mute.Muted
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
        queryKey: queryKeys.getSettings(userId),
        queryFn: () => getSettings({ userId }),
        enabled: !!userId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: Infinity,
    })
}

async function putSettings({ userSettings }: SaveSettingsRequestParams) {
    const url = `${PUSH_WORKER_URL}/api/notification-settings`
    const response = await axiosClient.put(url, {
        userSettings,
    })
    console.log('[putSettings] settings saved')
    return response.data
}

/**
 *
 * @returns mutate function to set a space or channel notification setting. If a channelId is passed, it will set the channel setting. If no channelId is passed, it will set the space setting.
 */
export function useSetMuteSettingForChannelOrSpace() {
    const userId = useMyProfile()?.userId
    const queryClient = useQueryClient()

    return useMutation({
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
                queryKey: queryKeys.getSettings(userId),
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

            return putSettings({ userSettings: notificationSettings })
        },
        onSuccess: async () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.getSettings(userId) })
        },
        onError: (error: unknown) => {
            console.error('[useSetNotificationSettings] error', error)
        },
    })
}
