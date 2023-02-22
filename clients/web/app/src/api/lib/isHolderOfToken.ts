import { useQuery } from '@tanstack/react-query'
import { useAccount } from 'wagmi'
import { z } from 'zod'
import { IsHolderOfCollectionResponse } from '@token-worker/types'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'
import { NETWORK } from './utils'

const PIONEER_NFT_ADDRESS = '0xdb66D5b28B9acc9FB55B96751Ba694829d7EE606'

const zSchema: z.ZodType<IsHolderOfCollectionResponse> = z.object({
    isHolderOfCollection: z.boolean(),
})

async function fetchIsHolderOfToken(wallet: string, address: string) {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/isHolderOfCollection/${NETWORK}?wallet=${wallet}&contractAddress=${address}`
    const response = await axiosClient.get(url)
    const parseResult = zSchema.safeParse(response.data)

    if (!parseResult.success) {
        throw new Error(`Error parsing IsHolderOfCollectionResponse:: ${parseResult.error}`)
    }

    return response.data
}

const queryKey = 'isHolderOfToken'

export function useIsHolderOfToken(address: string) {
    const { address: wallet } = useAccount()

    return useQuery(
        [queryKey, wallet, address],
        () => {
            if (!wallet) {
                return
            }
            return fetchIsHolderOfToken(wallet, address)
        },
        {
            select: ({ isHolderOfCollection }) => isHolderOfCollection,
            staleTime: 1000 * 60 * 60 * 24,
            enabled: Boolean(wallet),
        },
    )
}

export function useIsHolderOfPioneerNFT() {
    return useIsHolderOfToken(PIONEER_NFT_ADDRESS)
}
