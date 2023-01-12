import { useQuery } from '@tanstack/react-query'
import { getAllRolesFromSpace, getFilteredRolesFromSpace, useZionContext } from 'use-zion-client'

export const useAllRoles = (spaceNetworkId?: string) => {
    const { client } = useZionContext()

    return useQuery(
        ['allRoles', spaceNetworkId],
        () => {
            if (!client || !spaceNetworkId) return Promise.all([])
            return getAllRolesFromSpace(client, spaceNetworkId)
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
            if (!client || !spaceNetworkId) return Promise.resolve([])
            return getFilteredRolesFromSpace(client, spaceNetworkId)
        },
        {
            enabled: !!client && !!spaceNetworkId,
        },
    )
}
