import { useMemo } from 'react'
import { LOCALHOST_CHAIN_ID } from 'use-zion-client'
import { paymasterProxyMiddleware } from '@river/web3'
import { env } from 'utils'

export function useAccountAbstractionConfig(chainId: number) {
    return useMemo(() => {
        if (chainId === LOCALHOST_CHAIN_ID || !env.VITE_AA_RPC_URL) {
            return
        }
        return {
            aaRpcUrl: env.VITE_AA_RPC_URL,
            bundlerUrl: env.VITE_AA_BUNDLER_URL,
            entryPointAddress: env.VITE_AA_ENTRY_POINT_ADDRESS,
            factoryAddress: env.VITE_AA_FACTORY_ADDRESS,
            paymasterProxyUrl: env.VITE_AA_PAYMASTER_PROXY_URL,
            paymasterMiddleware: paymasterProxyMiddleware({
                paymasterProxyAuthSecret: env.VITE_AUTH_WORKER_HEADER_SECRET,
            }),
        }
    }, [chainId])
}
