import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { MINUTE_MS } from 'data/constants'
import { env } from 'utils'

export type TokenMetadata = {
    address: string
    decimals: number
    name: string
    symbol: string
    info: {
        imageThumbUrl?: string | null
    }
}

const zFilterTokensQuery = z.object({
    data: z.object({
        filterTokens: z.object({
            results: z.array(
                z.object({
                    token: z.object({
                        address: z.string(),
                        decimals: z.number(),
                        name: z.string(),
                        symbol: z.string(),
                        info: z.object({
                            imageThumbUrl: z.string().nullish(),
                        }),
                    }) satisfies z.ZodType<TokenMetadata>,
                }),
            ),
        }),
    }),
})

export type TradingActivityItem = {
    id: string
    token0Address: string
    token1Address: string
    token1ValueBase: string
    token0ValueBase: string
    networkId: number
    timestamp: number
    liquidityToken: string
    transactionHash: string
    eventDisplayType: string
    data: {
        amount0?: string | null
        amount1?: string | null
        amount0In?: string | null
        amount1In?: string | null
        amount0Out?: string | null
        amount1Out?: string | null
    }
    token0Metadata?: TokenMetadata
    token1Metadata?: TokenMetadata
}
const zTokenEventsForMaker = z.object({
    data: z.object({
        getTokenEventsForMaker: z.object({
            items: z.array(
                z.object({
                    id: z.string(),
                    token0Address: z.string(),
                    token1Address: z.string(),
                    token1ValueBase: z.string(),
                    token0ValueBase: z.string(),
                    networkId: z.number(),
                    timestamp: z.number(),
                    liquidityToken: z.string(),
                    transactionHash: z.string(),
                    eventDisplayType: z.string(),
                    data: z.object({
                        amount0: z.string().nullable(),
                        amount1: z.string().nullable(),
                        amount0In: z.string().nullable(),
                        amount1In: z.string().nullable(),
                        amount0Out: z.string().nullable(),
                        amount1Out: z.string().nullable(),
                    }),
                }) satisfies z.ZodType<TradingActivityItem>,
            ),
        }),
    }),
})

export const useTradingActivity = (walletAddress: string | undefined, chainId: string) => {
    const networkId = chainId === 'solana-mainnet' ? 1399811149 : Number(chainId)
    const apiKey = env.VITE_CODEX_API_KEY
    if (!apiKey) {
        console.error('VITE_CODEX_API_KEY missing')
    }

    async function getTokenEvents() {
        const query = buildGetTokenEventsForMakerQuery(walletAddress, networkId)
        const url = 'https://graph.defined.fi/graphql'
        const resp = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query }),
        })
        const json = await resp.json()
        return zTokenEventsForMaker.parse(json).data.getTokenEventsForMaker.items
    }

    async function getTokenMetadata(addresses: string[]) {
        const query = buildFilterTokensQuery(addresses, networkId)
        const url = 'https://graph.defined.fi/graphql'
        const resp = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query }),
        })

        const json = await resp.json()
        const metadata = zFilterTokensQuery.safeParse(json)
        if (!metadata.success) {
            console.error('Failed to get token metadata', metadata.error)
            return []
        }
        return metadata.data.data.filterTokens.results.map((item) => item.token)
    }

    const { data, isLoading } = useQuery({
        queryKey: ['tradingActivity', walletAddress ?? '', chainId],
        queryFn: async () => {
            try {
                const tokenEvents = await getTokenEvents()
                const tokenAddresses = tokenEvents.reduce((acc, item) => {
                    acc.add(item.token0Address)
                    acc.add(item.token1Address)
                    return acc
                }, new Set<string>())

                const tokenMetadata = await getTokenMetadata(Array.from(tokenAddresses))
                return buildResponse(tokenEvents, tokenMetadata)
            } catch (error) {
                console.error('Failed to get trading activity', error)
                return []
            }
        },
        enabled: !!apiKey && !!walletAddress,
        staleTime: MINUTE_MS,
    })

    return { data: data ?? [], isLoading }
}

function buildResponse(tokenEvents: TradingActivityItem[], metadata: TokenMetadata[]) {
    const metadataMap = metadata.reduce((acc, item) => {
        acc[item.address] = item
        return acc
    }, {} as Record<string, TokenMetadata>)
    tokenEvents = tokenEvents.map((item) => {
        return {
            ...item,
            token0Metadata: metadataMap[item.token0Address],
            token1Metadata: metadataMap[item.token1Address],
        }
    })
    return tokenEvents
}

function buildGetTokenEventsForMakerQuery(walletAddress: string | undefined, networkId: number) {
    return `
    {
        getTokenEventsForMaker(
            limit:100, 
            query: {
                maker:"${walletAddress}"
                timestamp: {
                    from: 0
                    to: 1999999999
                },
                eventType:Swap
                networkId:${networkId}
            }) {
                items {
                    id
                    token0ValueBase
                    token1ValueBase,
                    timestamp
                    token0Address
                    token1Address
                    networkId
                    liquidityToken
                    transactionHash
                    eventDisplayType
                    data {
                        ... on SwapEventData {
                        amount0
                        amount1
                        amount0In
                        amount1In
                        amount0Out
                        amount1Out
                    }
                }
            }
        }
    }
    `
}

function buildFilterTokensQuery(addresses: string[], networkId: number) {
    const tokens = addresses.map((address) => `"${address}:${networkId}"`).join(',')
    return `
    {
        filterTokens(
            limit: 200,
            tokens:[${tokens}]
        ) {
            results {
                token {
                    address
                    decimals
                    name
                    symbol
                    info {
                  	    imageThumbUrl
                	}
                }
            }
        }
    }
    `
}
