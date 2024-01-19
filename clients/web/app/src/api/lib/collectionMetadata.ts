import { useQuery } from '@tanstack/react-query'
import { ContractMetadata } from '@token-worker/types'
import { ethers } from 'ethers'
import { useRef } from 'react'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'
import { useNetworkForNftApi } from 'hooks/useNetworkForNftApi'

const queryKey = 'tokenMetadata'

async function getCollectionMetadata(
    address: string,
    nftNetwork: string,
): Promise<ContractMetadata> {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getCollectionMetadata/in/${nftNetwork}?contractAddress=${address}`
    const response = await axiosClient.get(url)

    return response.data
}

const failedMetadataCalls = new Map<string, boolean>()

export function useTokenMetadata(tokenAddress: string) {
    const nftNetwork = useNetworkForNftApi()
    const _address = tokenAddress.toLowerCase()
    const failureCount = useRef(0)

    return useQuery({
        queryKey: [queryKey, _address],
        queryFn: () => {
            try {
                return getCollectionMetadata(_address, nftNetwork)
            } catch (error) {
                // BUG: this is a hack to work around onError being removed from useQuery v5
                // there must be a better way to do this
                if (failureCount.current++ > 3) {
                    // some tokens are not NFTs and calls to NFT api will always fail
                    // we don't want to keep retrying these calls, so if there's 3 retries that result in failure, turn off future calls for this address
                    // note that the default retryDelay is an exponential backoff, so this won't trigger until after 5 seconds or so - maybe we want to adjust this?
                    failedMetadataCalls.set(_address, true)
                }
                throw error
            }
        },
        retry: 3,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 5,
        enabled: ethers.utils.isAddress(_address) && !failedMetadataCalls.has(_address),
    })
}
