import { useQuery } from '@tanstack/react-query'
import { useSpaceDapp } from 'use-zion-client'
import { useNetwork, useProvider } from 'wagmi'
import { ethers } from 'ethers'
import { PROD_CHAIN_ID, env } from 'utils'

// Grab the space info without requiring matrix client to be initialized
export const useContractSpaceInfo = (spaceId: string | undefined) => {
    const network = useNetwork()

    const chainId = env.IS_DEV ? network.chain?.id : PROD_CHAIN_ID
    const provider = useProvider<ethers.providers.Web3Provider>({ chainId })
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
