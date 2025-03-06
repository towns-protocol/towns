import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { env } from 'utils'
import { MINUTE_MS } from 'data/constants'

export type TimeFrame = '1h' | '1d' | '7d' | '30d' | '90d' | '365d'
export type GetBars = {
    o: number[]
    h: number[]
    l: number[]
    c: number[]
    t: number[]
}

type GetBarsResponse = {
    data: {
        getBars: GetBars
    }
}

const zGetBarsResponse: z.ZodType<GetBarsResponse> = z.object({
    data: z.object({
        getBars: z.object({
            o: z.array(z.number()),
            h: z.array(z.number()),
            l: z.array(z.number()),
            c: z.array(z.number()),
            t: z.array(z.number()),
        }),
    }),
})

export const useCoinBars = ({
    address,
    chain,
    timeframe,
    disabled = false,
}: {
    address: string
    chain: string
    timeframe: TimeFrame
    disabled?: boolean
}) => {
    const { data, isLoading } = useQuery({
        queryKey: ['searchTokens', address, chain, timeframe],
        queryFn: async () => {
            const apiKey = env.VITE_CODEX_API_KEY
            if (!apiKey) {
                console.error('VITE_CODEX_API_KEY missing')
                return { o: [], h: [], l: [], c: [], t: [] }
            }
            const query = createQuery(address, chain, timeframe)
            const url = 'https://graph.defined.fi/graphql'
            const resp = await fetch(url, {
                method: 'POST',
                headers: { Authorization: `${apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: query }),
            })

            const json = await resp.json()
            return zGetBarsResponse.safeParse(json).data?.data.getBars
        },
        gcTime: MINUTE_MS,
        enabled: !disabled,
    })

    return { data: data ?? { o: [], h: [], l: [], c: [], t: [] }, isLoading }
}

function createQuery(address: string, chain: string, timeframe: TimeFrame): string {
    const networkId = chain === 'solana-mainnet' ? 1399811149 : Number(chain)
    const resolution = () => {
        switch (timeframe) {
            case '1h':
                return '1'
            case '1d':
                return '15'
            case '7d':
                return '60'
            case '30d':
                return '240'
            case '90d':
                return '720'
            case '365d':
                return '7D'
        }
    }

    const days = () => {
        switch (timeframe) {
            case '1h':
                return 1 / 24
            case '1d':
                return 1
            case '7d':
                return 7
            case '30d':
                return 30
            case '90d':
                return 90
            case '365d':
                return 365
        }
    }

    const to = Date.now() / 1000
    const from = to - 60 * 60 * 24 * days()

    const query = `
    query {
        getBars(
            symbol: "${address}:${networkId}"
            from: ${from.toFixed(0)}
            to: ${to.toFixed(0)}
            resolution: "${resolution()}"
            removeLeadingNullValues: true
        ) {
            o
            h
            l
            c
            t
        }
    }
    `
    return query
}
