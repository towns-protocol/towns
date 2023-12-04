import { useQuery } from '@tanstack/react-query'
import { balanceOfMockNFT } from '@river/web3'
import { Address } from 'wagmi'
import { useWeb3Context } from 'use-zion-client'
import { useEnvironment } from './useEnvironmnet'

const QUERY_KEY = 'balanceOfMockNFT'

export function useMockNftBalance(address: Address) {
    const { provider } = useWeb3Context()
    const chainId = useEnvironment().chainId

    return useQuery(
        [QUERY_KEY, chainId, address],
        () => {
            if (!address || !provider) {
                return null
            }
            return Promise.resolve(balanceOfMockNFT(chainId, provider, address))
        },
        {
            select: (balance) => balance?.toString(),
            // poll every 3 seconds
            refetchInterval: 3_000,
            refetchOnReconnect: false,
            // only need this for local dev on foundry
            enabled: chainId === 31337 && Boolean(address) && Boolean(provider),
        },
    )
}
