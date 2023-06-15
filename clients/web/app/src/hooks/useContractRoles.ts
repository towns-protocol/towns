import { useQuery } from '@tanstack/react-query'
import { getFilteredRolesFromSpace, useZionContext } from 'use-zion-client'

export const useContractRoles = (spaceNetworkId?: string) => {
    const { client } = useZionContext()

    return useQuery(
        ['spaceRoles', spaceNetworkId],
        () => {
            console.log(spaceNetworkId)
            if (!client || !spaceNetworkId) {
                return Promise.resolve([])
            }
            return getFilteredRolesFromSpace(client, spaceNetworkId)
        },
        {
            enabled: !!client && !!spaceNetworkId,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            staleTime: 1000 * 15,
        },
    )
}
