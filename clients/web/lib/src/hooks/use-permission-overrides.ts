import { useQuery } from '../query/queryClient'
import { Permission } from '@river-build/web3'
import { useCallback } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { blockchainKeys } from '../query/query-keys'
import { useSpaceDapp } from './use-space-dapp'

export function usePermissionOverrides(
    spaceId: string,
    channelId: string,
    roleId: number | undefined,
): {
    isLoading: boolean
    permissions: Permission[] | undefined | null
    error: unknown
} {
    const { baseProvider: provider, baseConfig: config } = useTownsContext()

    const spaceDapp = useSpaceDapp({
        config,
        provider,
    })

    const isEnabled =
        spaceDapp &&
        spaceId.length > 0 &&
        roleId != undefined &&
        roleId >= 0 &&
        channelId.length > 0

    const getDefaultPermissions = useCallback(
        async function () {
            if (!spaceDapp || !isEnabled) {
                return undefined
            }
            return await spaceDapp.getPermissionsByRoleId(spaceId, roleId)
        },
        [spaceDapp, isEnabled, spaceId, roleId],
    )

    const getPermissions = useCallback(
        async function () {
            if (!spaceDapp || !isEnabled) {
                return undefined
            }
            return await spaceDapp.getChannelPermissionOverrides(
                spaceId,
                roleId,
                channelId.startsWith('0x') ? channelId : `0x${channelId}`,
            )
        },
        [spaceDapp, isEnabled, spaceId, channelId, roleId],
    )

    const queryKey = blockchainKeys.channelPermissionOverrides(
        spaceId,
        typeof roleId === 'number' ? roleId : -1,
        channelId,
    )

    const {
        isLoading,
        data: permissions,
        error,
    } = useQuery(
        queryKey,
        async () => {
            const [spacePermissions, permissionOverrides] = await Promise.all([
                getDefaultPermissions(),
                getPermissions(),
            ])
            if (!Array.isArray(spacePermissions) || !Array.isArray(permissionOverrides)) {
                throw new Error('Failed to fetch permissions')
            }

            // prevent returning overrides if they are empty - this shouldn't
            // happen since the overrides always contain a [READ]
            // https://linear.app/hnt-labs/issue/TOWNS-11582/explicitly-return-nullish-if-permission-overrides-are-not
            if (permissionOverrides.length > 0 || spacePermissions.length === 0) {
                return permissionOverrides
            }
            return null
        },
        {
            enabled: true,
        },
    )

    return {
        isLoading,
        permissions,
        error,
    }
}
