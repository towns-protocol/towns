import { useSpaceDapp } from './use-space-dapp'
import { useQuery } from '../query/queryClient'
import { blockchainKeys } from '../query/query-keys'
import { useTownsContext } from '../components/TownsContextProvider'

export function useTokenIdOfOwner(spaceId: string | undefined, ownerAddress: string) {
    const { baseProvider: provider, baseConfig: config, xchainConfig } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    return useQuery(
        blockchainKeys.tokenIdOfOwner(spaceId, ownerAddress),
        () => {
            if (!spaceDapp || !spaceId || !ownerAddress) {
                return
            }
            return spaceDapp.getTokenIdOfOwner(spaceId, ownerAddress, xchainConfig)
        },
        {
            enabled: !!spaceDapp && !!spaceId && !!ownerAddress,
        },
    )
}
