import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { useThrottledValue } from 'use-towns-client'
import { useEffect, useState } from 'react'
import { env } from 'utils'
import { useIsHNTMember } from 'hooks/useIsHNTMember'
import { MINUTE_MS } from 'data/constants'
import { TComboboxItemWithData, TMentionTicker } from './types'

const zParsedToken = z.object({
    networkId: z.number(),
    name: z.string(),
    address: z.string(),
    symbol: z.string(),
    info: z.object({
        imageThumbUrl: z.string().nullish(),
    }),
})

const zParsedTokenResponse = z.object({
    data: z.object({
        filterTokens: z.object({
            results: z.array(
                z.object({
                    marketCap: z.string(),
                    priceUSD: z.string(),
                    token: zParsedToken,
                }),
            ),
        }),
    }),
})

function remapResponse(
    item: ReturnType<typeof zParsedTokenResponse.safeParse>,
): TComboboxItemWithData<TMentionTicker>[] {
    if (item.error) {
        console.error('graphql error', item.error)
    }
    if (!item.success || !item.data) {
        return []
    }

    return item.data.data.filterTokens.results
        .map((result) => {
            // different APIs use different neworkIds for Solana.
            const chain = () => {
                switch (result.token.networkId) {
                    case 1399811149:
                        return 'solana-mainnet'
                    default:
                        return result.token.networkId.toString()
                }
            }

            return {
                key: result.token.address,
                text: result.token.symbol,
                data: {
                    name: result.token.name,
                    symbol: result.token.symbol,
                    address: result.token.address,
                    chain: chain(),
                    imageUrl: result.token.info.imageThumbUrl ?? '',
                    marketCap: result.marketCap,
                    priceUSD: result.priceUSD,
                },
            } satisfies TComboboxItemWithData<TMentionTicker>
        })
        .filter((item) => item.data.chain !== '')
}

const EMPTY_ARRAY: TComboboxItemWithData<TMentionTicker>[] = []

export const useSearchTokens = ({
    searchString,
    enabled,
}: {
    searchString: string
    enabled: boolean
}) => {
    const { isHNTMember } = useIsHNTMember()
    const query = createQuery(searchString)
    const throttledQuery = useThrottledValue(query, 500)

    const [savedData, setSavedData] = useState<TComboboxItemWithData<TMentionTicker>[]>([])

    const { data, isLoading } = useQuery({
        queryKey: ['searchTokens', throttledQuery],
        queryFn: async () => {
            const apiKey = env.VITE_CODEX_API_KEY
            if (!apiKey) {
                console.error('VITE_CODEX_API_KEY missing')
                return []
            }
            const url = 'https://graph.defined.fi/graphql'
            const resp = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: throttledQuery }),
            })
            const json = await resp.json()
            const parsed = zParsedTokenResponse.safeParse(json)
            const remapped = remapResponse(parsed)
            return remapped
        },
        enabled: enabled && isHNTMember,
        gcTime: MINUTE_MS,
    })

    useEffect(() => {
        if (!isLoading) {
            setSavedData(data ?? EMPTY_ARRAY)
        }
    }, [data, isLoading])

    return { data: savedData, isLoading }
}

function createQuery(searchString: string) {
    return `
    {
        filterTokens(
            filters: {
                liquidity: { gt: 10000 }
                network: [1399811149, 8453]
            }
            phrase:"${searchString}"
            limit: 10
            rankings:{
                attribute: volume24
            }
        ) {
            results {
                marketCap
                priceUSD
                
                token {
                    address
                    decimals
                    name
                    networkId
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
