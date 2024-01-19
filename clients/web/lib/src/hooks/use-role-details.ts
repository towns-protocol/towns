import { useQuery, useQueryClient } from '../query/queryClient'

import { blockchainKeys } from '../query/query-keys'
import { useCallback } from 'react'
import { useWeb3Context } from '../components/Web3ContextProvider'
import { useSpaceDapp } from './use-space-dapp'
import { RoleDetails } from '../types/web3-types'
/**
 * Convience function to get space role details.
 */

export function useRoleDetails(
    spaceId: string,
    roleId: number,
): {
    isLoading: boolean
    roleDetails: RoleDetails | undefined | null
    error: unknown
} {
    const { provider, chain } = useWeb3Context()

    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })

    const isEnabled = spaceDapp && spaceId.length > 0 && roleId >= 0

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
        blockchainKeys.roleDetails(spaceId, roleId),
        getRole,
        // options for the query.
        {
            enabled: isEnabled,
            refetchOnMount: true,
        },
    )

    return {
        isLoading,
        roleDetails,
        error,
    }
}

export function useMultipleRoleDetails(spaceId: string, roleIds: number[]) {
    const queryClient = useQueryClient()
    const { provider, chain } = useWeb3Context()

    const spaceDapp = useSpaceDapp({
        chainId: chain?.id,
        provider,
    })
    const isEnabled = spaceDapp && spaceId.length > 0 && roleIds.length > 0

    const getRoles = useCallback(
        async function (): Promise<RoleDetails[]> {
            if (!spaceDapp) {
                return []
            }

            const getRolePromises: Promise<RoleDetails | null>[] = []
            for (const roleId of roleIds) {
                getRolePromises.push(spaceDapp.getRole(spaceId, roleId))
            }
            const roles = await Promise.all(getRolePromises)
            return roles.filter((role) => role !== null) as RoleDetails[]
        },
        [spaceDapp, roleIds, spaceId],
    )

    const queryData = useQuery<RoleDetails[]>(
        blockchainKeys.multipleRoleDetails(spaceId, roleIds),
        getRoles,
        // options for the query.
        {
            enabled: isEnabled,
            refetchOnMount: true,
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
