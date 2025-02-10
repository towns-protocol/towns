import { useQuery } from '@tanstack/react-query'
import { MINUTE_MS } from 'data/constants'
import { lifiRequest } from './lifiApiClient'

export type LifiChainToken = {
    chainId: number
    address: string
    coinKey?: string
    decimals: number
    logoURI?: string | null
    name: string
    priceUSD: string
    symbol: string
}

export type LifiChainTokensResponse = {
    tokens: { [key: number]: LifiChainToken[] }
}

// fetches all tokens currently available for trading across all known chains
// includes both EVM and SVM tokens
// https://docs.li.fi/li.fi-api/li.fi-api/requesting-all-known-tokens
export const useTradingTokens = () => {
    const { data, isLoading } = useQuery({
        queryKey: ['lifi-tokens'],
        queryFn: () =>
            lifiRequest<LifiChainTokensResponse>('v1/tokens', 'GET', {
                chainTypes: 'EVM,SVM',
            }),
        staleTime: MINUTE_MS * 30, // 30 minutes, this list can be cached for a while
    })
    return { data, isLoading }
}
