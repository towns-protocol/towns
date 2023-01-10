import { useQuery } from '@tanstack/react-query'
import { getAllRolesFromSpace, getFilteredRolesFromSpace, useZionContext } from 'use-zion-client'

export const useAllRoles = (spaceNetworkId: string) => {
    const { client } = useZionContext()

    return useQuery(
        ['allRoles', spaceNetworkId],
        () => {
            if (!client) return
            return getAllRolesFromSpace(client, spaceNetworkId)
        },
        {
            enabled: !!client,
        },
    )
}

export const useChannelCreationRoles = (spaceNetworkId: string) => {
    const { client } = useZionContext()

    return useQuery(
        ['channelRoles', spaceNetworkId],
        () => {
            if (!client) return Promise.resolve([])
            return getFilteredRolesFromSpace(client, spaceNetworkId)
        },
        {
            enabled: !!client,
        },
    )
}
