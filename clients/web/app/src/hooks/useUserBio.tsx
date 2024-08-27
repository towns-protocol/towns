import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { z } from 'zod'
import { useOfflineStore, useTownsClient } from 'use-towns-client'
import { UserBio } from '@river-build/proto'
import { env } from 'utils'
import { axiosClient } from '../api/apiClient'

const queryKey = 'userBio'

const zBioReadData: z.ZodType<{
    bio: string
}> = z.object({
    bio: z.string(),
})

export async function getUserBio(
    walletAddress: string,
    cachedBio: string | undefined,
    setOfflineUserBio: (walletAddress: string, bio: string) => void,
): Promise<string> {
    const metadataUrl = new URL(env.VITE_RIVER_STREAM_METADATA_URL)
    metadataUrl.pathname = `/user/${walletAddress}/bio`
    const userBio = await axiosClient.get(metadataUrl.toString())
    const parseResult = zBioReadData.safeParse(userBio.data)

    if (!parseResult.success) {
        console.error("Couldn't parse user bio:: ", parseResult.error)
        return cachedBio ?? ''
    }

    const bio = parseResult.data.bio
    setOfflineUserBio(walletAddress, bio)
    return bio
}

export const useGetUserBio = (walletAddress: string | undefined) => {
    // walletAddress is the abstractAccountAddress
    const { offlineUserBioMap, setOfflineUserBio } = useOfflineStore()

    const _getUserBio = useCallback(async () => {
        if (!walletAddress) {
            return
        }
        return await getUserBio(
            walletAddress as string,
            offlineUserBioMap[walletAddress],
            setOfflineUserBio,
        )
    }, [walletAddress, offlineUserBioMap, setOfflineUserBio])

    return useQuery({
        queryKey: [queryKey, walletAddress],
        queryFn: _getUserBio,
        enabled: !!walletAddress,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 60 * 24,
    })
}

export const useSetUserBio = (userId: string | undefined) => {
    const queryClient = useQueryClient()
    const { offlineUserBioMap, setOfflineUserBio } = useOfflineStore()
    const { client } = useTownsClient()

    const setUserBio = useCallback(
        async (bio: string) => {
            if (!userId) {
                return
            }
            await client?.setUserBio(new UserBio({ bio }))
            const updated = await getUserBio(userId, offlineUserBioMap[userId], setOfflineUserBio)
            setOfflineUserBio(userId, updated)
            queryClient.setQueryData([queryKey, userId], updated)
        },
        [client, offlineUserBioMap, queryClient, setOfflineUserBio, userId],
    )

    return useMutation({
        mutationFn: setUserBio,
    })
}
