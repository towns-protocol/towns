import { ChainId } from '@decent.xyz/box-common'
import { useMemo } from 'react'
import { useEnvironment } from 'hooks/useEnvironmnet'

export function useSrcAndDstChains() {
    const { baseChain } = useEnvironment()
    const isBaseMainnet = baseChain.id === ChainId.BASE
    const [srcChain, dstChain] = useMemo(() => {
        if (isBaseMainnet) {
            return [ChainId.ETHEREUM, ChainId.BASE]
        }
        return [ChainId.BASE_SEPOLIA, ChainId.BASE_SEPOLIA]
    }, [isBaseMainnet])

    return { srcChain, dstChain }
}
