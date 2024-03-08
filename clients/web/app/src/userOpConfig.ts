import { useMemo } from 'react'
import { LOCALHOST_CHAIN_ID } from 'use-towns-client'
import { paymasterProxyMiddleware } from '@towns/userops'
import { env } from 'utils'

export function useAccountAbstractionConfig(chainId: number) {
    return useMemo(() => {
        if (chainId === LOCALHOST_CHAIN_ID) {
            return
        }
        return {
            aaRpcUrl: env.VITE_PROVIDER_HTTP_URL,
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
