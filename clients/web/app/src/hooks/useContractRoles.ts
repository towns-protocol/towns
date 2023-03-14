import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { getFilteredRolesFromSpace, useZionContext } from 'use-zion-client'

export const useSpaceRoles = (spaceNetworkId?: string) => {
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
        },
    )
}

export const useSpaceRoleIds = (spaceNetworkId?: string) => {
    const { data: spaceRoles } = useSpaceRoles(spaceNetworkId)
    return useMemo(() => {
        return spaceRoles?.map((role) => role.roleId.toNumber()) ?? []
    }, [spaceRoles])
}
