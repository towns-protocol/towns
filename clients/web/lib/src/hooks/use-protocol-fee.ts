import { useTownsContext } from '../components/TownsContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { blockchainKeys } from '../query/query-keys'
import { useQuery } from '../query/queryClient'

export function useProtocolFee({ spaceId }: { spaceId: string | undefined }) {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()
    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    return useQuery(
        blockchainKeys.protocolFee(spaceId),
        () => {
            if (!spaceId) {
                throw new Error('Space ID is required')
            }
            const space = spaceDapp.getSpace(spaceId)
            return space?.getProtocolFee()
        },
        {
            enabled: !!spaceDapp,
        },
    )
}
