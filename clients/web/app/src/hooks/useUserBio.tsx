import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { z } from 'zod'
import { env } from 'utils'
import { axiosClient } from '../api/apiClient'

const queryKey = 'userBio'

const zBioReadData: z.ZodType<{
    bio: string
}> = z.object({
    bio: z.string(),
})

export async function getUserBio(walletAddress: string): Promise<string> {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/user/${walletAddress}/bio`

    const userBio = await axiosClient.get(url)
    const parseResult = zBioReadData.safeParse(userBio.data)

    if (!parseResult.success) {
        throw new Error("Couldn't parse user bio:: ", parseResult.error)
    }

    return parseResult.data.bio
}

export async function setUserBio(walletAddress: string, bio: string): Promise<void> {
    const GATEWAY_SERVER_URL = env.VITE_GATEWAY_URL
    const url = `${GATEWAY_SERVER_URL}/user/${walletAddress}/bio`
    await axiosClient.post(url, JSON.stringify({ bio: bio }), {
        withCredentials: true,
    })
}

export const useGetUserBio = (walletAddress: string | undefined) => {
    const _getUserBio = useCallback(async () => {
        if (!walletAddress) {
            return
        }
        return getUserBio(walletAddress as string)
    }, [walletAddress])

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

export const useSetUserBio = (walletAddress: string | undefined) => {
    const queryClient = useQueryClient()

    const _setUserBio = useCallback(
        (bio: string) => {
            if (!walletAddress) {
                return Promise.reject('No wallet address')
            }

            return setUserBio(walletAddress, bio)
        },
        [walletAddress],
    )

    return useMutation({
        mutationFn: _setUserBio,
        onSuccess: async () => {
            return queryClient.invalidateQueries({ queryKey: [queryKey, walletAddress] })
        },
        onError: (error) => {
            console.error('[useSetUserBio] error', error)
        },
    })
}
