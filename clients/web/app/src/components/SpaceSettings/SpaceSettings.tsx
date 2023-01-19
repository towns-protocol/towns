import React, { useEffect, useState } from 'react'
import { Outlet, useNavigate, useParams } from 'react-router'
import { NavLink } from 'react-router-dom'
import useEvent from 'react-use-event-hook'
import { IconButton, Stack } from '@ui'
import { useSpaceSettingsStore } from 'store/spaceSettingsStore'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { SpaceSettingsNotifications } from './SpaceSettingsNotifications'
import { useSpaceSettingChanges } from './store/hooks/useSpaceSettingChanges'

export const SpaceSettings = () => {
    const { role: roleId, spaceSlug: spaceId = '' } = useParams()

    const reset = useSpaceSettingsStore((state) => state.reset)
    const space = useSpaceSettingsStore((state) => state.space)
    const [spaceSnapshot, setSpaceSnapShot] = useState(space)

    // TODO: this is dumb, set a proper flow when real data is available
    useEffect(() => {
        const space = reset({ spaceId })
        setSpaceSnapShot(space)
    }, [reset, spaceId])

    const { spaceSettingChanges } = useSpaceSettingChanges(space, spaceSnapshot)

    const getDefaultRole = useSpaceSettingsStore((state) => state.getDefaultRole)

    const navigate = useNavigate()
    const defaultPath = `roles/${getDefaultRole()?.id}/permissions`

    useEffect(() => {
        if (!roleId) {
            navigate(defaultPath)
        }
    }, [defaultPath, navigate, roleId])

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
