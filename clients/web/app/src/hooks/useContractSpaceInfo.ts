import { useQuery } from '@tanstack/react-query'
import { useSpaceDapp, useWeb3Context } from 'use-zion-client'
import { PROD_CHAIN_ID, env } from 'utils'

// Grab the space info without requiring matrix client to be initialized
export const useContractSpaceInfo = (spaceId: string | undefined) => {
    const { provider, chain } = useWeb3Context()

    const chainId = env.IS_DEV ? chain?.id : PROD_CHAIN_ID

    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    return useQuery(
        ['spaceDappGetSpaceInfo', spaceId],
        async () => {
            if (spaceId && spaceDapp) {
                const spaceInfo = await spaceDapp.getSpaceInfo(spaceId)
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
