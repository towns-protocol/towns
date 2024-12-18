import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { useTownsContext } from 'use-towns-client'
import { z } from 'zod'
import { env } from 'utils'
import { formatUnitsToFixedLength, parseUnits } from 'hooks/useBalance'

const zodSchema = z.object({
    data: z.array(
        z.object({
            symbol: z.string(),
            prices: z.array(
                z.object({
                    value: z.string(),
                    currency: z.string(),
                    lastUpdatedAt: z.string(),
                }),
            ),
        }),
    ),
})

async function fetchEthPrice() {
    const response = await fetch(
        `https://api.g.alchemy.com/prices/v1/${env.VITE_BASE_CHAIN_RPC_URL?.split(
            '/',
        ).pop()}/tokens/by-symbol?symbols=ETH`,
        {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        },
    )

    const data = await response.json()
    const parsed = zodSchema.safeParse(data)

    if (!parsed.success) {
        throw new Error(`Failed to fetch ETH price, zod parse failed: ${parsed.error}`)
    }

    const priceInUsd = parsed.data.data[0].prices[0].value

    return priceInUsd
}

const queryKey = () => ['ethPrice']

export function useEthPrice(args: {
    enabled?: boolean
    refetchInterval?: number
    watch?: boolean
}) {
    const { enabled = true, refetchInterval, watch = false } = args
    const { baseProvider } = useTownsContext()
    const queryClient = useQueryClient()
    const _queryKey = queryKey()

    const onBlock = useCallback(
        () => queryClient.invalidateQueries({ queryKey: _queryKey }),
        [queryClient, _queryKey],
    )

    useEffect(() => {
        if (!enabled) {
            return
        }

        if (refetchInterval) {
            return
        }

        baseProvider.on('block', onBlock)

        return () => {
            baseProvider.off('block', onBlock)
        }
    }, [baseProvider, enabled, onBlock, watch, refetchInterval])

    return useQuery({
        queryKey: _queryKey,
        queryFn: fetchEthPrice,
        enabled: enabled,
        refetchInterval: watch ? undefined : refetchInterval,
        staleTime: 5_000,
        gcTime: 10_000,
    })
}

export function calculateEthAmountFromUsd(args: { cents: number; ethPriceInUsd: string }) {
    const { cents, ethPriceInUsd } = args
    const usdAmount = cents / 100
    const usdAmountBigInt = parseUnits(usdAmount.toString(), 18)
    const ethPriceInUsdBigInt = parseUnits(ethPriceInUsd, 18)
    const ethAmountBigInt = (usdAmountBigInt * BigInt(1e18)) / ethPriceInUsdBigInt

    return {
        value: ethAmountBigInt,
        formatted: formatUnitsToFixedLength(ethAmountBigInt),
    }
}
