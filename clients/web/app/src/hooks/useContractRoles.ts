import { useQuery } from '@tanstack/react-query'
import { useTownsContext } from 'use-towns-client'
import { getFilteredRolesFromSpace } from '@river-build/web3'

export const useContractRoles = (spaceNetworkId?: string) => {
    const { client } = useTownsContext()

    return useQuery({
        queryKey: ['spaceRoles', spaceNetworkId],

        queryFn: () => {
            console.log(spaceNetworkId)
            if (!client || !spaceNetworkId) {
                return Promise.resolve([])
            }
            return getFilteredRolesFromSpace(client.spaceDapp, spaceNetworkId)
        },

        enabled: !!client && !!spaceNetworkId,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 1000 * 15,
    })
}
