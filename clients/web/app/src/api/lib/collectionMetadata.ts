import { useQueries } from '@tanstack/react-query'
import { RoomIdentifier } from 'use-zion-client'
import { useMemo } from 'react'
import { ContractMetadata } from '@token-worker/types'
import { ethers } from 'ethers'
import { env } from 'utils'
import { axiosClient } from 'api/apiClient'
import { NETWORK } from './utils'

const queryKey = 'collectionMetatdata'

async function getCollectionMetadata(address: string): Promise<ContractMetadata> {
    const TOKENS_SERVER_URL = env.VITE_TOKEN_SERVER_URL
    const url = `${TOKENS_SERVER_URL}/api/getContractMetadata/${NETWORK}?contractAddress=${address}`
    const response = await axiosClient.get(url)

    return response.data
}

export function useRoleTokensMetatdata(spaceId: RoomIdentifier, tokenAddresses: string[]) {
    const queryData = useQueries({
        queries: tokenAddresses.map((address) => {
            return {
                queryKey: [queryKey, spaceId, address],
                queryFn: () => {
                    return getCollectionMetadata(address)
                },
                staleTime: 1000 * 60 * 5,
                enabled: ethers.utils.isAddress(address),
            }
        }),
    })

    return useMemo(() => {
        if (queryData.every((token) => token.isFetched)) {
            return {
                data: queryData.map((token) => token.data).filter((data) => !!data),
                isLoading: false,
            }
        }

        return {
            data: undefined,
            isLoading: true,
        }
    }, [queryData])
}
