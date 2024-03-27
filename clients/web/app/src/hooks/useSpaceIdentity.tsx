import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { z } from 'zod'
import { staleTime24Hours } from 'use-towns-client'
import { env } from 'utils'
import { axiosClient } from '../api/apiClient'

const queryKey = 'spaceIdentity'

const zBioReadData: z.ZodType<{
    motto: string
    bio: string
}> = z.object({
    motto: z.string(),
    bio: z.string(),
})

interface SpaceIdentity {
    motto: string
    bio: string
}

export async function getSpaceIdentity(spaceId: string): Promise<SpaceIdentity> {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/space/${spaceId}/identity`

    const spaceTopic = await axiosClient.get(url)
    const parseResult = zBioReadData.safeParse(spaceTopic.data)

    if (!parseResult.success) {
        throw new Error("Couldn't parse space topic:: ", parseResult.error)
    }

    return {
        motto: parseResult.data.motto,
        bio: parseResult.data.bio,
    }
}

export async function setSpaceIdentity(
    spaceId: string,
    spaceIdentity: SpaceIdentity,
): Promise<void> {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/space/${spaceId}/identity`
    await axiosClient.post(url, JSON.stringify(spaceIdentity), {
        withCredentials: true,
    })
}

export const useGetSpaceIdentity = (networkId: string | undefined) => {
    const _getSpaceTopic = useCallback(async () => {
        if (!networkId) {
            return
        }
        return getSpaceIdentity(networkId)
    }, [networkId])

    return useQuery({
        queryKey: [queryKey, networkId],
        queryFn: _getSpaceTopic,
        enabled: !!networkId,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: staleTime24Hours,
    })
}

export const useSetSpaceIdentity = (
    spaceId: string | undefined,
    {
        onError,
    }: {
        onError?: (error: unknown) => void
    } = {},
) => {
    const queryClient = useQueryClient()

    const _setSpaceIdenity = useCallback(
        // in case you cannot pass the spaceId as a parameter, you can use the innerSpaceId in the callback
        ({
            spaceIdentity: spaceIdentity,
            innerSpaceId: innerSpaceId,
        }: {
            spaceIdentity: SpaceIdentity
            innerSpaceId?: string
        }) => {
            const _id = innerSpaceId ?? spaceId
            if (!_id) {
                return Promise.reject('No space id')
            }

            return setSpaceIdentity(_id, spaceIdentity)
        },
        [spaceId],
    )

    return useMutation({
        mutationFn: _setSpaceIdenity,
        onSuccess: async () => {
            return queryClient.invalidateQueries({ queryKey: [queryKey, spaceId] })
        },
        onError: (error: unknown) => {
            console.error('[useSetSpaceIdentity] error', error)
            if (onError) {
                onError(error)
            }
        },
    })
}
