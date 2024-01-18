import { UseQueryResult, useQuery } from '@tanstack/react-query'
import { useSpaceDapp, useWeb3Context } from 'use-zion-client'
import { SpaceInfo } from '@river/web3'
import { useEnvironment } from './useEnvironmnet'
// Grab the space info without requiring client to be initialized
export const useContractSpaceInfo = (
    spaceId: string | undefined,
): UseQueryResult<SpaceInfo | undefined> => {
    const { provider } = useWeb3Context()
    const { chainId } = useEnvironment()

    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    return useQuery(
        ['spaceDappGetSpaceInfo', spaceId],
        async () => {
            console.log('useContractSpaceInfo', { spaceId, spaceDapp })
            if (spaceId && spaceDapp) {
                const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
                console.log('useContractSpaceInfo', { spaceInfo })
                // Query data cannot be undefined. Return a value other than undefined from query function.
                return spaceInfo ?? null
            } else {
                // Query data cannot be undefined. Return a value other than undefined from query function.
                return null
            }
        },
        {
            enabled: !!spaceId && !!spaceDapp,
            staleTime: 1000 * 15,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
        },
    )
}
