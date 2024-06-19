import { useMemo } from 'react'
import { BASE_SEPOLIA, LOCALHOST_CHAIN_ID } from 'use-towns-client'
import { useEnvironment } from 'hooks/useEnvironmnet'

export function useWalletPrefix() {
    const { baseChainConfig } = useEnvironment()
    return useMemo(() => {
        if (baseChainConfig.chainId === LOCALHOST_CHAIN_ID) {
            return 'localhost'
        }
        if (baseChainConfig.chainId === BASE_SEPOLIA) {
            return 'BaseSepolia'
        }
        return 'Base'
    }, [baseChainConfig.chainId])
}
