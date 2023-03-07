import React, { useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'
import useEvent from 'react-use-event-hook'
import { useMultipleRoleDetails, useRoleDetails, useRoles } from 'use-zion-client'
import { IconButton, Stack } from '@ui'
import {
    Role,
    SpaceSettings as SpaceSettingsType,
    useSpaceSettingsStore,
} from 'store/spaceSettingsStore'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { SpaceSettingsNotifications } from './SpaceSettingsNotifications'
import { useSpaceSettingChanges } from './store/hooks/useSpaceSettingChanges'

export const SpaceSettings = () => {
    const { role: roleId, spaceSlug = '' } = useParams()
    const spaceId = useMemo(() => decodeURIComponent(spaceSlug), [spaceSlug])

    const space = useSpaceSettingsStore((state) => state.space)
    const rolesWithDetails = useGetAllRoleDetails(spaceId)

    const [spaceSnapshot, setSpaceSnapShot] = useState<SpaceSettingsType>()

    // when user navigates away, clear the saved space data
    useEffect(() => {
        return () => useSpaceSettingsStore.getState().clearSpace()
    }, [])

    useEffect(() => {
        // only set the space data once, when the roles are loaded
        if (space || !rolesWithDetails) {
            return
        }
        const _space = useSpaceSettingsStore
            .getState()
            .setSpace({ spaceId, roles: rolesWithDetails })
        setSpaceSnapShot(_space)
    }, [rolesWithDetails, space, spaceId])

    const { spaceSettingChanges } = useSpaceSettingChanges(space, spaceSnapshot)

    const getDefaultRole = useSpaceSettingsStore((state) => state.getDefaultRole)

    const navigate = useNavigate()
    const defaultPath = `roles/${getDefaultRole()?.id}/permissions`

    useEffect(() => {
        if (space && !roleId) {
            navigate(defaultPath)
        }
    }, [defaultPath, navigate, roleId, space])

    const onClose = useEvent(() => {
        navigate(`/spaces/${spaceId}`)
    })

    return (
        <Stack horizontal grow minWidth="100%">
            <Stack minWidth="200">
                <Stack gap="sm" padding="sm">
                    <SpaceSettingsNavItem selected icon="all">
                        <NavLink to={defaultPath}>Roles</NavLink>
                    </SpaceSettingsNavItem>
                    <SpaceSettingsNavItem icon="delete" color="secondary">
                        Delete Space
                    </SpaceSettingsNavItem>
                </Stack>
            </Stack>
            <Outlet />
            <SpaceSettingsNotifications spaceSettingChanges={spaceSettingChanges} />
            <Stack position="topRight" padding="lg">
                <IconButton icon="close" color="default" onClick={onClose} />
            </Stack>
        </Stack>
    )
}

function mapRoleStructToRole(
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails'],
): Role | undefined {
    if (!roleDetails) {
        return
    }
    return {
        id: roleDetails.id.toString(),
        name: roleDetails.name,
        permissions: roleDetails.permissions,
        tokens: roleDetails.tokens.map((t) => t.contractAddress as string),
        users: roleDetails.users,
    }
}

function useGetAllRoleDetails(spaceId: string) {
    const { spaceRoles: _roles, isLoading: rolesLoading } = useRoles(decodeURIComponent(spaceId))

    const roledIds = useMemo(() => _roles?.map((r) => r.roleId?.toNumber()) ?? [], [_roles])
    const { data: _rolesDetails, isLoading: detailsLoading } = useMultipleRoleDetails(
        decodeURIComponent(spaceId),
        roledIds,
    )
    return useMemo(() => {
        if (!_rolesDetails || rolesLoading || detailsLoading) {
            return
        }
        return _rolesDetails?.map(mapRoleStructToRole).filter((role): role is Role => !!role)
    }, [_rolesDetails, rolesLoading, detailsLoading])
}
