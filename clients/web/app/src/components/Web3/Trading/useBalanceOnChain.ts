import { useMemo } from 'react'
import { ethers } from 'ethers'
import { useQuery } from '@tanstack/react-query'
import { env } from 'utils'

export const useBalanceOnChain = (address: string | undefined, chainId: number) => {
    const rpcUrl = useMemo(() => {
        switch (chainId) {
            case 8453:
                return env.VITE_BASE_CHAIN_RPC_URL
            default:
                return undefined
        }
    }, [chainId])

    const provider = useMemo(() => {
        return new ethers.providers.StaticJsonRpcProvider(rpcUrl, {
            chainId: chainId,
            name: chainId.toString(),
        })
    }, [rpcUrl, chainId])

    const { data, isLoading } = useQuery({
        queryKey: ['trading-use-balance', chainId],
        queryFn: () => {
            return provider.getBalance(address ?? '')
        },
        enabled: !!rpcUrl,
    })
    return { data: data?.toBigInt() ?? 0n, isLoading }
}
