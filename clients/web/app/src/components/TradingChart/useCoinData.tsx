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

// Codex uses the following network ids + addresses for solana and ethereum native tokens
// we need to remap if needed
function remapAddressToCodexFormat(networkId: number, address: string) {
    if (networkId === 1399811149 && address === '11111111111111111111111111111111') {
        return 'So11111111111111111111111111111111111111112:1399811149'
    } else if (networkId === 8453 && address === '0x0000000000000000000000000000000000000000') {
        return '0x4200000000000000000000000000000000000006:8453'
    }
    return `${address}:${networkId}`
}

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
    const remappedAddress = remapAddressToCodexFormat(networkId, address)

    const query = `
     {
        filterTokens(
            filters: {}
            tokens: ["${remappedAddress}"]
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

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['searchTokens', query],
        queryFn: async () => {
            const apiKey = env.VITE_CODEX_API_KEY
            if (!apiKey) {
                console.error('VITE_CODEX_API_KEY missing')
                return undefined
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
        staleTime: MINUTE_MS,
        enabled: !disabled,
    })

    return {
        data: data as GetCoinDataResponse | undefined,
        isLoading,
        isError,
        error,
    }
}
