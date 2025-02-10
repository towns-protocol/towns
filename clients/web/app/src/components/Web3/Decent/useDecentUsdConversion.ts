import { TokenInfo } from '@decent.xyz/box-common'
import { useUsdConversion } from '@decent.xyz/box-hooks'
import { useEffect, useMemo, useState } from 'react'

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
