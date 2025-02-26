import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { env } from 'utils'
import { MINUTE_MS } from 'data/constants'

export type GetCoinDataResponse = {
    marketCap: string
    priceUSD: string
    change24: string
    liquidity: string
    volume24: string
    holders: number
    token: {
        address: string
        decimals: number
        name: string
        networkId: number
        symbol: string
        info: {
            imageThumbUrl: string | null
            circulatingSupply: string
            totalSupply: string
        }
    }
}

const zCoinData: z.ZodType<GetCoinDataResponse> = z.object({
    marketCap: z.string(),
    priceUSD: z.string(),
    change24: z.string(),
    liquidity: z.string(),
    volume24: z.string(),
    holders: z.number(),
    token: z.object({
        address: z.string(),
        decimals: z.number(),
        name: z.string(),
        networkId: z.number(),
        symbol: z.string(),
        info: z.object({
            imageThumbUrl: z.string().nullable(),
            circulatingSupply: z.string(),
            totalSupply: z.string(),
        }),
    }),
})

const zParsedTokenResponse = z.object({
    data: z.object({
        filterTokens: z.object({
            results: z.array(zCoinData),
        }),
    }),
})

export const useCoinData = ({
    address,
    chain,
    disabled = false,
}: {
    address: string
    chain: string
    disabled?: boolean
}) => {
    const networkId = chain === 'solana-mainnet' ? 1399811149 : Number(chain)
    const query = `
     {
        filterTokens(
            filters: {
                network: [${networkId}]
            }
            tokens: ["${address}:${networkId}"]
            limit: 1
        ) {
            results {
                marketCap
                priceUSD
                change24
                liquidity
                volume24
                holders
                token {
                    address
                    decimals
                    name
                    networkId
                    symbol
                    info {
                        imageThumbUrl
                        circulatingSupply
                        totalSupply
                    }
                }
            }
        }
    }
    `

    const { data, isLoading } = useQuery({
        queryKey: ['searchTokens', query],
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
                body: JSON.stringify({ query: query }),
            })
            const json = await resp.json()
            const parsed = zParsedTokenResponse.safeParse(json)
            return parsed.data?.data.filterTokens.results[0]
        },
        gcTime: MINUTE_MS,
        enabled: !disabled,
    })

    return { data: data as GetCoinDataResponse | undefined, isLoading }
}
