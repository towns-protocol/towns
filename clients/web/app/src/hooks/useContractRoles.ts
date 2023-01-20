import { useQuery } from '@tanstack/react-query'
import { getFilteredRolesFromSpace, useZionContext } from 'use-zion-client'

export const useAllRoles = (spaceNetworkId?: string) => {
    const { client } = useZionContext()

    return useQuery(
        ['allRoles', spaceNetworkId],
        () => {
            return spaceNetworkId && client
                ? client.spaceDapp.getRoles(spaceNetworkId)
                : Promise.resolve([])
        },
        {
            enabled: !!client && !!spaceNetworkId,
        },
    )
}

export const useChannelCreationRoles = (spaceNetworkId?: string) => {
    const { client } = useZionContext()

    return useQuery(
        ['channelRoles', spaceNetworkId],
        () => {
            console.log(spaceNetworkId)
            if (!client || !spaceNetworkId) {
                return Promise.resolve([])
            }
            return getFilteredRolesFromSpace(client, spaceNetworkId)
        },
        {
            enabled: !!client && !!spaceNetworkId,
        },
    )
}
