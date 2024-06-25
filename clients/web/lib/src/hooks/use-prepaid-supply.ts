import { useTownsContext } from './../components/TownsContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'

export function usePrepaidSupply(spaceId: string | undefined) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        provider,
        config,
    })

    return useQuery(
        blockchainKeys.prepaidSupply(spaceId),
        async () => {
            if (!spaceId) {
                return
            }
            const supply = await spaceDapp.getPrepaidMembershipSupply(spaceId)
            return supply.toNumber()
        },
        {
            enabled: !!spaceDapp && !!spaceId,
        },
    )
}
