import { useQueries, useQuery } from '@tanstack/react-query'
import { RoomIdentifier } from 'use-zion-client'
import { useMemo } from 'react'
import { ContractMetadata } from '@token-worker/types'
import { ethers } from 'ethers'
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

    return useQuery({
        queryKey: [queryKey, _address],
        queryFn: () => {
            return getCollectionMetadata(_address, nftNetwork)
        },
        // some tokens are not NFTs and calls to NFT api will always fail
        // we don't want to keep retrying these calls, so if there's 3 retries that result in failure, turn off future calls for this address
        // note that the default retryDelay is an exponential backoff, so this won't trigger until after 5 seconds or so - maybe we want to adjust this?
        onError: () => {
            failedMetadataCalls.set(_address, true)
        },
        retry: 3,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 60 * 5,
        cacheTime: 1000 * 60 * 10,
        enabled: ethers.utils.isAddress(_address) && !failedMetadataCalls.has(_address),
    })
}

export function useRoleTokensMetatdata(spaceId: RoomIdentifier, tokenAddresses: string[]) {
    const nftNetwork = useNetworkForNftApi()

    const queryData = useQueries({
        queries: tokenAddresses.map((address) => {
            return {
                queryKey: [queryKey, spaceId, address],
                queryFn: () => {
                    return getCollectionMetadata(address, nftNetwork)
                },
                staleTime: 1000 * 60 * 5,
                enabled: ethers.utils.isAddress(address),
            }
        }),
    })

    return useMemo(() => {
        const errors = queryData.map((token) => token.error).filter((error) => !!error)

        if (queryData.every((token) => token.isFetched)) {
            return {
                data: queryData.map((token) => token.data).filter((data) => !!data),
                errors,
                isLoading: false,
            }
        }

        return {
            data: undefined,
            errors,
            isLoading: true,
        }
    }, [queryData])
}
