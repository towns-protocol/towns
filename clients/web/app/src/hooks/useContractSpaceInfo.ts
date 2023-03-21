import { useQuery } from '@tanstack/react-query'
import { useSpaceDapp, useWeb3Context } from 'use-zion-client'
import { useCorrectChainForServer } from './useCorrectChainForServer'

// Grab the space info without requiring matrix client to be initialized
export const useContractSpaceInfo = (spaceId: string | undefined) => {
    const { provider } = useWeb3Context()
    const chain = useCorrectChainForServer()

    const chainId = chain.id

    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    return useQuery(
        ['spaceDappGetSpaceInfo', spaceId],
        async () => {
            if (spaceId && spaceDapp) {
                const spaceInfo = await spaceDapp.getSpaceInfo(spaceId, false)
                if (spaceInfo) {
                    return spaceInfo
                }
                return null
            }
            return null
        },
        {
            enabled: !!spaceId,
        },
    )
}
