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
}: {
    address: Address | undefined
    enabled?: boolean
    watch?: boolean
    gcTime?: number
    staleTime?: number
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

        baseProvider.on('block', onBlock)

        return () => {
            baseProvider.off('block', onBlock)
        }
    }, [baseProvider, enabled, onBlock, watch])

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
                formatted: formatUnits(value ?? '0', 18),
                value,
            }
        },
        enabled: enabled && !!address,
        staleTime: staleTime ?? 10_000,
        gcTime: gcTime ?? 15_000,
    })
}

export function formatUnits(value: bigint, decimals: number) {
    let display = value.toString()

    const negative = display.startsWith('-')
    if (negative) {
        display = display.slice(1)
    }

    display = display.padStart(decimals, '0')

    const [integer, fraction] = [
        display.slice(0, display.length - decimals),
        display.slice(display.length - decimals),
    ]
    const _fraction = fraction.replace(/(0+)$/, '')
    return `${negative ? '-' : ''}${integer || '0'}${_fraction ? `.${_fraction}` : ''}`
}
