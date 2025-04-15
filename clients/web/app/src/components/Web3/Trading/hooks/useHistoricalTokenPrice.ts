import { useQuery } from '@tanstack/react-query'
import { axiosClient } from 'api/apiClient'
import { env } from 'utils'

const fetchHistoricalTokenPrice = async (
    contractAddress: string,
    chainId: string,
    timestamp: number,
): Promise<number | undefined> => {
    const networkId = chainId === 'solana-mainnet' ? 1399811149 : Number(chainId)
    try {
        type TokenPriceResponse = {
            data: {
                getTokenPrices: Array<{
                    priceUsd: string
                }>
            }
        }

        const { data } = await axiosClient.get<TokenPriceResponse>(
            `${env.VITE_GATEWAY_URL}/tokens/price`,
            {
                params: {
                    contractAddress,
                    chainId: networkId,
                    timestamp,
                },
            },
        )

        // Check if we have valid price data
        if (data?.data?.getTokenPrices?.[0]?.priceUsd) {
            return parseFloat(data.data.getTokenPrices[0].priceUsd)
        }
        return undefined
    } catch (error) {
        console.error('Failed to fetch historical token price:', error)
        throw error
    }
}

export const useHistoricalTokenPrice = (
    contractAddress: string | undefined,
    chainId: string | undefined,
    timestamp: number | undefined,
) => {
    return useQuery({
        queryKey:
            contractAddress && chainId && timestamp
                ? [contractAddress, chainId, timestamp]
                : (['historicalTokenPrice', 'placeholder'] as const),
        queryFn: () => {
            if (!contractAddress || !chainId || !timestamp) {
                return Promise.resolve(undefined)
            }
            return fetchHistoricalTokenPrice(contractAddress, chainId, timestamp)
        },
        enabled: Boolean(contractAddress && chainId && timestamp),
        staleTime: Infinity, // Historical data doesn't change, so we can cache it indefinitely
    })
}
