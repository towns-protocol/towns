import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo } from 'react'
import { Address, useTownsContext } from 'use-towns-client'

const queryKey = (address: Address | undefined) => ['useBalance', address ?? 'waitingForAddress']

/**
 * Simple hook to replace wagmi's useBalance hook (wagmi)
 */
export function useBalance({
    address,
    enabled = true,
    watch = false,
    staleTime,
    gcTime,
    fixedLength = 5,
    refetchInterval,
}: {
    address: Address | undefined
    enabled?: boolean
    watch?: boolean
    gcTime?: number
    staleTime?: number
    fixedLength?: number
    refetchInterval?: number
}) {
    const { baseProvider } = useTownsContext()
    const queryClient = useQueryClient()
    const _queryKey = useMemo(() => queryKey(address), [address])

    const onBlock = useCallback(
        () => queryClient.invalidateQueries({ queryKey: _queryKey }),
        [_queryKey, queryClient],
    )

    useEffect(() => {
        if (!enabled || !watch) {
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
        queryFn: async () => {
            if (!address) {
                return undefined
            }
            return baseProvider.getBalance(address)
        },
        select: (data) => {
            if (!data) {
                return
            }
            const value = data.toBigInt()

            return {
                // TODO: if we ever needed to, then chain.nativeCurrency.decimals
                decimals: 18,
                // TODO: if we ever needed to, then chain.nativeCurrency.symbol
                symbol: 'ETH',
                formatted: formatUnitsToFixedLength(value ?? '0', 18, fixedLength),
                value,
            }
        },
        enabled: enabled && !!address,
        refetchInterval: watch ? undefined : refetchInterval,
        staleTime: staleTime ?? 10_000,
        gcTime: gcTime ?? 15_000,
    })
}

export function formatUnits(value: bigint, decimals: number = 18): string {
    if (value === 0n) {
        return '0'
    }

    const isNegative = value < 0n
    const absoluteValue = isNegative ? -value : value

    const stringValue = absoluteValue.toString().padStart(decimals + 1, '0')
    const integerPart = stringValue.slice(0, -decimals) || '0'
    const fractionalPart = stringValue.slice(-decimals).replace(/0+$/, '')

    const formattedValue = fractionalPart ? `${integerPart}.${fractionalPart}` : integerPart
    return isNegative ? `-${formattedValue}` : formattedValue
}

export function parseUnits(value: string, decimals: number = 18): bigint {
    if (!value || value === '.') {
        return 0n
    }

    const [integerPart = '0', fractionalPart = ''] = value.split('.')
    const paddedFractionalPart = fractionalPart.padEnd(decimals, '0').slice(0, decimals)
    const combinedValue = `${integerPart}${paddedFractionalPart}`

    return BigInt(combinedValue)
}

export function formatUnitsToFixedLength(
    value: bigint,
    baseDecimals: number = 18,
    displayDecimals: number = 5,
): string {
    // Calculate the scaling factor to shift decimal places correctly
    const scaleFactor = 10n ** BigInt(baseDecimals - displayDecimals)

    // Scale and round the BigInt value
    const roundedValue = (value + scaleFactor / 2n) / scaleFactor

    if (value === 0n) {
        return '0'
    }

    const smallestDisplayableValue = `0.${'0'.repeat(displayDecimals - 1)}1`
    if (roundedValue === 0n) {
        return `< ${smallestDisplayableValue}`
    } else if (roundedValue === 1n) {
        return `> ${smallestDisplayableValue}`
    }

    return formatUnits(roundedValue, displayDecimals)
}
