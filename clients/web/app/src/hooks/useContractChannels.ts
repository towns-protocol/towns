import { useQuery } from '@tanstack/react-query'
import { IUseropSpaceDapp, useSpaceDapp, useWeb3Context } from 'use-zion-client'
import { useEnvironment } from './useEnvironmnet'

async function getChannels(spaceId: string | undefined, spaceDapp: IUseropSpaceDapp | undefined) {
    if (spaceId && spaceDapp) {
        const channels = await spaceDapp.getChannels(spaceId)
        if (channels) {
            return channels
        }
    }
}

const queryKey = 'spaceDappGetChannels'

export const useContractChannels = (spaceId: string | undefined) => {
    const { provider } = useWeb3Context()
    const { chainId } = useEnvironment()

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
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 1000 * 15,
        },
    )
}
