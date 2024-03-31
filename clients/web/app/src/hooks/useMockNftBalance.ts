import { useQuery } from '@tanstack/react-query'
import { balanceOfMockNFT } from '@river-build/web3'
import { Address } from 'wagmi'
import { useTownsContext } from 'use-towns-client'

const QUERY_KEY = 'balanceOfMockNFT'

export function useMockNftBalance(address: Address) {
    const { baseProvider: provider, baseChain: chain } = useTownsContext()
    const chainId = chain.id

    return useQuery({
        queryKey: [QUERY_KEY, chainId, address],

        queryFn: () => {
            if (!address || !provider) {
                return null
            }
            return Promise.resolve(balanceOfMockNFT(chainId, provider, address))
        },

        select: (balance) => balance?.toString(),

        // poll every 3 seconds
        refetchInterval: 3_000,

        refetchOnReconnect: false,

        // only need this for local dev on foundry
        enabled: chainId === 31337 && Boolean(address) && Boolean(provider),
    })
}
