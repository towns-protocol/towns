import { useWeb3Context } from '../components/Web3ContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { staleTime24Hours, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'

export function usePricingModules() {
    const { provider, chain } = useWeb3Context()

    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })

    return useQuery(
        blockchainKeys.pricingModules(chain?.id),
        () => {
            if (!spaceDapp) {
                return
            }
            return spaceDapp.listPricingModules()
        },
        {
            enabled: !!spaceDapp,
            staleTime: staleTime24Hours,
            gcTime: staleTime24Hours,
        },
    )
}
