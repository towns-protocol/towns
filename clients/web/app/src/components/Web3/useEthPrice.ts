import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { queryClient, useTownsContext } from 'use-towns-client'
import { formatUnitsToFixedLength, parseUnits } from 'hooks/useBalance'
import { fetchEthPrice } from './fetchEthPrice'

const queryKey = () => ['ethPrice']

export function useEthPrice(
    args: {
        enabled?: boolean
        refetchInterval?: number
        watch?: boolean
    } = {},
) {
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

export function ensureEthPrice() {
    return queryClient.ensureQueryData({
        queryKey: queryKey(),
        queryFn: fetchEthPrice,
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

export const INVALID_CALCULATION = 'INVALID'
export function calculateUsdAmountFromToken(args: {
    tokenAmount: unknown | undefined
    tokenPriceInUsd: unknown | undefined
    decimals?: number
}): bigint | typeof INVALID_CALCULATION | undefined {
    const { tokenAmount, tokenPriceInUsd, decimals = 18 } = args
    if (!tokenAmount || !tokenPriceInUsd) {
        return undefined
    }

    let amountAsBigInt: bigint
    try {
        // @ts-expect-error - unknown type
        amountAsBigInt = BigInt(tokenAmount)
    } catch (error) {
        console.warn(
            '[calculateUsdAmountFromToken] Failed to convert tokenAmount to BigInt:',
            tokenAmount,
            error,
        )
        return INVALID_CALCULATION
    }
    if (typeof tokenPriceInUsd !== 'string') {
        console.warn(
            '[calculateUsdAmountFromToken] tokenPriceInUsd is not a string',
            tokenPriceInUsd,
        )
        return INVALID_CALCULATION
    }
    if (!/^\d+(\.\d+)?$/.test(tokenPriceInUsd)) {
        console.warn(
            '[calculateUsdAmountFromToken] tokenPriceInUsd is not a valid numerical string:',
            tokenPriceInUsd,
        )
        return undefined
    }

    const tokenPriceInUsdBigInt = parseUnits(tokenPriceInUsd, decimals)
    const usdValueBigInt = (amountAsBigInt * tokenPriceInUsdBigInt) / BigInt(10 ** decimals)
    return usdValueBigInt
}

export function useEthToUsdFormatted(args: {
    ethAmount: bigint | undefined
    refetchInterval?: number
}) {
    const { ethAmount, refetchInterval = 8_000 } = args
    const { data: ethPrice } = useEthPrice({
        refetchInterval: refetchInterval,
    })
    const amount = calculateUsdAmountFromToken({
        tokenAmount: ethAmount,
        tokenPriceInUsd: ethPrice?.toString(),
    })
    if (amount === INVALID_CALCULATION) {
        return '--'
    }
    return formatUsd(formatUnitsToFixedLength(amount || 0n))
}

export const formatUsd = (totalPrice: string) => {
    return `$${Intl.NumberFormat('en-US', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(parseFloat(totalPrice))}`
}
