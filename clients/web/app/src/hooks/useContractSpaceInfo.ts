import { UseQueryResult, useQuery } from '@tanstack/react-query'
import { useSpaceDapp, useWeb3Context } from 'use-zion-client'
import type { SpaceInfo } from 'use-zion-client/src/client/web3/SpaceInfo'
import { useEnvironment } from './useEnvironmnet'

// Grab the space info without requiring matrix client to be initialized
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
            if (spaceId && spaceDapp) {
                const spaceInfo: SpaceInfo | undefined = await spaceDapp.getSpaceInfo(spaceId)
                // Query data cannot be undefined. Return a value other than undefined from query function.
                return spaceInfo ?? null
            } else {
                // Query data cannot be undefined. Return a value other than undefined from query function.
                return null
            }
        },
        {
            enabled: !!spaceId,
        },
    )
}
