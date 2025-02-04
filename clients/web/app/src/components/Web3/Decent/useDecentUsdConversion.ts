import { TokenInfo } from '@decent.xyz/box-common'
import { useUsdConversion } from '@decent.xyz/box-hooks'
import { useMemo } from 'react'

export function useDecentUsdConversion(srcToken: TokenInfo | undefined) {
    const { data, isLoading, error } = useUsdConversion({
        tokenAddress: srcToken?.address,
        chainId: srcToken?.chainId,
        enable: !!srcToken,
    })

    return useMemo(() => {
        // data.quote.raw = something like 3271040000 - usd cost w/o decimals, i.e. 3271.04
        const _data =
            data && data.quote
                ? {
                      ...data,
                      // this matches other eth price apis we use
                      decimalFormat: (Number(data.quote.raw) / 1_000_000).toString(),
                  }
                : undefined
        return {
            data: _data,
            isLoading,
            error,
        }
    }, [data, isLoading, error])
}
