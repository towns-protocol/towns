import { useSpaceDapp } from './use-space-dapp'
import { staleTime24Hours, useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'

export function usePricingModules() {
    const { baseProvider: provider, baseChain: chain, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    return useQuery(
        blockchainKeys.pricingModules(chain.id),
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
