import { useQuery } from '@tanstack/react-query'
import { ISpaceDapp, useSpaceDapp, useTownsContext } from 'use-towns-client'

async function getChannels(spaceId: string | undefined, spaceDapp: ISpaceDapp | undefined) {
    if (spaceId && spaceDapp) {
        const channels = await spaceDapp.getChannels(spaceId)
        if (channels) {
            return channels
        }
    }
}

const queryKey = 'spaceDappGetChannels'

export const useContractChannels = (spaceId: string | undefined) => {
    const { baseProvider: provider, baseChain: chain } = useTownsContext()
    const chainId = chain.id

    const spaceDapp = useSpaceDapp({
        chainId,
        provider,
    })

    return useQuery({
        queryKey: [queryKey, spaceId],

        queryFn: () => {
            return getChannels(spaceId, spaceDapp)
        },

        enabled: !!spaceId,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 15,
    })
}
