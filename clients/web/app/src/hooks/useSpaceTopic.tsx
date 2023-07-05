import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { RoomIdentifier } from 'use-zion-client'
import { z } from 'zod'
import { env } from 'utils'
import { axiosClient } from '../api/apiClient'

const queryKey = 'roomTopic'

const zBioReadData: z.ZodType<{
    bio: string
}> = z.object({
    bio: z.string(),
})

export async function getSpaceTopic(roomId: string): Promise<string> {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/space/${roomId}/bio`

    const spaceTopic = await axiosClient.get(url)
    const parseResult = zBioReadData.safeParse(spaceTopic.data)

    if (!parseResult.success) {
        throw new Error("Couldn't parse space topic:: ", parseResult.error)
    }

    return parseResult.data.bio
}

export async function setSpaceTopic(roomId: RoomIdentifier, topic: string): Promise<void> {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/space/${roomId.networkId}/bio`
    await axiosClient.post(url, JSON.stringify({ bio: topic }), {
        withCredentials: true,
    })
}

export const useGetSpaceTopic = (networkId: string | undefined) => {
    const _getSpaceTopic = useCallback(async () => {
        if (!networkId) {
            return
        }
        return getSpaceTopic(networkId)
    }, [networkId])

    return useQuery([queryKey, networkId], _getSpaceTopic, {
        enabled: !!networkId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 60 * 24,
        cacheTime: 1000 * 60 * 60 * 24,
    })
}

export const useSetSpaceTopic = (roomId: RoomIdentifier | undefined) => {
    const queryClient = useQueryClient()

    const _setSpaceTopic = useCallback(
        (description: string) => {
            if (!roomId) {
                return Promise.reject('No space id')
            }

            return setSpaceTopic(roomId, description)
        },
        [roomId],
    )

    return useMutation(_setSpaceTopic, {
        onSuccess: async () => {
            return queryClient.invalidateQueries(['roomTopic', roomId?.networkId])
        },
        onError: (error) => {
            console.error('[useSetSpaceTopic] error', error)
        },
    })
}
