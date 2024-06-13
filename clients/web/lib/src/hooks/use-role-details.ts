import { defaultStaleTime, useQuery, useQueryClient } from '../query/queryClient'

import { blockchainKeys } from '../query/query-keys'
import { useCallback, useEffect } from 'react'
import { useSpaceDapp } from './use-space-dapp'
import { RoleDetails } from '../types/web3-types'
import { useTownsContext } from '../components/TownsContextProvider'
import { ISpaceDapp } from '@river-build/web3'
/**
 * Convience function to get space role details.
 */

export function useRoleDetails(
    spaceId: string,
    roleId: number | undefined,
): {
    isLoading: boolean
    roleDetails: RoleDetails | undefined | null
    error: unknown
} {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    const isEnabled = spaceDapp && spaceId.length > 0 && roleId != undefined && roleId >= 0

    const getRole = useCallback(
        async function () {
            if (!spaceDapp || !isEnabled) {
                return undefined
            }
            const role = await spaceDapp.getRole(spaceId, roleId)
            return role
        },
        [spaceDapp, isEnabled, roleId, spaceId],
    )

    const {
        isLoading,
        data: roleDetails,
        error,
    } = useQuery(
        blockchainKeys.roleDetails(spaceId, isEnabled ? roleId : -1),
        getRole,
        // options for the query.
        {
            enabled: isEnabled,
        },
    )

    return {
        isLoading,
        roleDetails,
        error,
    }
}

async function getRoles(spaceId: string, roleIds: number[], spaceDapp: ISpaceDapp) {
    if (!spaceDapp) {
        return []
    }

    const getRolePromises: Promise<RoleDetails | null>[] = []
    for (const roleId of roleIds) {
        getRolePromises.push(spaceDapp.getRole(spaceId, roleId))
    }
    const roles = await Promise.all(getRolePromises)
    return roles.filter((role) => role !== null) as RoleDetails[]
}

export function useMultipleRoleDetails(spaceId: string, roleIds: number[]) {
    const queryClient = useQueryClient()
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })
    const isEnabled = spaceDapp && spaceId.length > 0 && roleIds.length > 0

    const queryData = useQuery<RoleDetails[]>(
        blockchainKeys.multipleRoleDetails(spaceId, roleIds),
        () => getRoles(spaceId, roleIds, spaceDapp),
        // options for the query.
        {
            enabled: isEnabled,
        },
    )

    const invalidateQuery = useCallback(
        () =>
            queryClient.invalidateQueries({
                queryKey: blockchainKeys.multipleRoleDetails(spaceId),
            }),
        [queryClient, spaceId],
    )

    return {
        data: queryData.data,
        isLoading: queryData.isLoading,
        invalidateQuery,
    }
}

export const usePrefetchMultipleRoleDetails = (spaceId: string | undefined, roleIds: number[]) => {
    const queryClient = useQueryClient()
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    useEffect(() => {
        async function prefetch() {
            if (!spaceId) {
                return
            }
            await queryClient.prefetchQuery({
                queryKey: blockchainKeys.multipleRoleDetails(spaceId, roleIds),
                queryFn: () => getRoles(spaceId, roleIds, spaceDapp),
                staleTime: defaultStaleTime,
            })
        }
        void prefetch()
    }, [queryClient, spaceId, roleIds, spaceDapp])
}
