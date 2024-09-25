import { isDefined } from '@river-build/sdk'
import React, { useMemo } from 'react'
import {
    EVERYONE_ADDRESS,
    Permission,
    RoleDetails,
    useLinkedWalletsForWallet,
    useMultipleRoleDetails,
    useRoles,
    useSpaceId,
} from 'use-towns-client'
import { Box, BoxProps, Paragraph } from '@ui'

type Props = {
    userId: string | undefined
}

export const UserRoles = (props: Props) => {
    const { userId } = props
    const spaceId = useSpaceId()

    if (!userId || !spaceId) {
        return null
    }

    return (
        <Box gap padding background="level2" borderRadius="sm">
            <Paragraph fontWeight="strong" color="default">
                Roles
            </Paragraph>
            <UserRolePills userId={userId} spaceId={spaceId} />
        </Box>
    )
}

const MODERATOR_PERMISSIONS: Permission[] = [
    Permission.Redact,
    Permission.PinMessage,
    Permission.Ban,
    Permission.AddRemoveChannels,
    Permission.ModifySpaceSettings,
]

const MINTER_ROLE = 1

const DEFAULT_ROLE_NAMES: { [key: string]: string } = {
    2: 'Member',
}

export const UserRolePills = (props: { userId: string; spaceId: string }) => {
    const { userId, spaceId } = props

    const { spaceRoles, isLoading: isLoadingRoles } = useRoles(spaceId)
    const roleIds = useMemo(() => spaceRoles?.map((role) => role.roleId) || [], [spaceRoles])

    const { data: linkedWallets } = useLinkedWalletsForWallet({ walletAddress: userId })

    const { data: roleDetails, isLoading: isLoadingRoleDetails } = useMultipleRoleDetails(
        spaceId,
        roleIds,
    )

    const matchingRoles = useMemo(() => {
        return linkedWallets
            ? roleDetails
                  ?.filter(
                      (r) =>
                          (r.id !== MINTER_ROLE && r.users.includes(EVERYONE_ADDRESS)) ||
                          linkedWallets?.some((w) => r.users.includes(w)),
                  )
                  .filter(isDefined)
            : []
    }, [linkedWallets, roleDetails])

    if (isLoadingRoles || isLoadingRoleDetails) {
        return <Paragraph color="gray2">Loading</Paragraph>
    }

    if (!matchingRoles || matchingRoles.length === 0) {
        return <Paragraph color="gray2">No roles</Paragraph>
    }

    return (
        <Box horizontal flexWrap="wrap" display="flex" gap="xs">
            {matchingRoles.map((r) => (
                <RolePill key={r.id} roleDetails={r} spaceId={spaceId} userId={userId} />
            ))}
        </Box>
    )
}

const RolePill = (props: { roleDetails: RoleDetails; userId: string; spaceId: string }) => {
    const { roleDetails } = props

    const boxProps = useMemo((): Partial<BoxProps> => {
        if (roleDetails.permissions.some((p) => MODERATOR_PERMISSIONS.includes(p))) {
            return { background: 'cta2', color: 'default' }
        }
        return { background: 'level3', color: 'default' }
    }, [roleDetails.permissions])

    return (
        <Box padding="sm" borderRadius="sm" {...boxProps}>
            <Paragraph truncate size="sm">
                {DEFAULT_ROLE_NAMES[roleDetails.id] ?? roleDetails.name}
            </Paragraph>
        </Box>
    )
}
