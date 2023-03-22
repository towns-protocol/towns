import { useQuery } from '@tanstack/react-query'
import { useSpaceDapp, useWeb3Context } from 'use-zion-client'
import { ISpaceDapp } from 'use-zion-client/dist/client/web3/ISpaceDapp'
import { PROD_CHAIN_ID, env } from 'utils'

async function getChannels(spaceId: string | undefined, spaceDapp: ISpaceDapp | undefined) {
    if (spaceId && spaceDapp) {
        const channels = await spaceDapp.getChannels(spaceId)
        if (channels) {
            return channels
        }
    }
}

export const queryKey = 'spaceDappGetChannels'

export const useContractChannels = (spaceId: string | undefined) => {
    const { provider, chain } = useWeb3Context()
    const chainId = env.IS_DEV ? chain?.id : PROD_CHAIN_ID
    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    return useQuery(
        [queryKey, spaceId],
        () => {
            return getChannels(spaceId, spaceDapp)
        },
        {
            enabled: !!spaceId,
            staleTime: 1000 * 60 * 30,
            cacheTime: 1000 * 60 * 35,
        },
    )
}
