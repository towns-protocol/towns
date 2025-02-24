import { TokenInfo } from '@decent.xyz/box-common'
import { useUsdConversion } from '@decent.xyz/box-hooks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatUnits, formatUnitsToFixedLength } from 'hooks/useBalance'
import { INVALID_CALCULATION, calculateUsdAmountFromToken, formatUsd } from '../useEthPrice'

export function useDecentUsdConversion(srcToken: TokenInfo | undefined) {
    const [shouldFormat, setShouldFormat] = useState(true)

    // Add delay when srcToken changes because the previous stale data of srcToken is used and causes a flash of the wrong USD conversion
    useEffect(() => {
        setShouldFormat(false)
        const timer = setTimeout(() => {
            setShouldFormat(true)
        }, 1000)

        return () => clearTimeout(timer)
    }, [srcToken])

    const { data, isLoading, error } = useUsdConversion({
        tokenAddress: srcToken?.address,
        chainId: srcToken?.chainId,
        enable: !!srcToken,
    })

    return useMemo(() => {
        return {
            data: shouldFormat ? data : undefined,
            isLoading,
            error,
        }
    }, [shouldFormat, data, isLoading, error])
}

// Prefers a USD conversion for the token, but falls back to a formatted token amount if there are errors with the USD conversion
export function useUsdOrTokenConversion() {
    return useCallback(
        (args: {
            tokenAmount: bigint | undefined
            symbol: string | undefined
            tokenPriceInUsd: string | undefined
            decimals: number | undefined
        }): string | undefined => {
            const { tokenAmount, symbol, tokenPriceInUsd, decimals } = args

            let usdAmount: ReturnType<typeof calculateUsdAmountFromToken>

            if (tokenAmount === undefined || tokenPriceInUsd === undefined) {
                return
            }

            const formattedTokenAmount = () => {
                if (typeof tokenAmount === 'bigint') {
                    return `${formatUnitsToFixedLength(tokenAmount, decimals)} ${symbol ?? ''}`
                }
                console.log('[useSafeUsdAmount] `tokenAmount` is not a bigint', tokenAmount)
                return '--'
            }

            try {
                usdAmount = calculateUsdAmountFromToken({
                    tokenAmount,
                    tokenPriceInUsd,
                    decimals,
                })
            } catch (error) {
                console.error('[useSafeUsdAmount] error from calculateUsdAmountFromToken', error)
                return formattedTokenAmount()
            }

            if (!usdAmount) {
                return formattedTokenAmount()
            }

            if (usdAmount === INVALID_CALCULATION || typeof usdAmount !== 'bigint') {
                if (usdAmount !== INVALID_CALCULATION) {
                    console.log('[useSafeUsdAmount] `usdAmount` is not a bigint', usdAmount)
                }

                return formattedTokenAmount()
            }

            try {
                return formatUsd(formatUnits(usdAmount, decimals))
            } catch (error) {
                console.error('[useSafeUsdAmount] error formatting usd amount', error)
                return formattedTokenAmount()
            }
        },
        [],
    )
}
