import React from 'react'
import { useNavigate, useParams } from 'react-router'
import useEvent from 'react-use-event-hook'
import { Icon, Stack } from '@ui'
import { useSpaceSettingsStore } from 'store/spaceSettingsStore'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { SpaceSettingsRolesNavItem } from './SpaceSettingsRolesNavItem'

export const SpaceSettingsRolesNav = () => {
    const { role } = useParams()
    const addRole = useSpaceSettingsStore((state) => state.addRole)
    const removeRole = useSpaceSettingsStore((state) => state.removeRole)
    const roles = useSpaceSettingsStore((state) => state.space?.roles)
    const navigate = useNavigate()

    const onAddRole = useEvent(() => {
        addRole({ id: 'new-role', name: 'New Role' })
        navigate(`../roles/new-role/display`)
    })

    const onRemoveRole = useEvent((roleId: string) => {
        removeRole(roleId)
    })

    if (!roles) {
        return null
    }

    return (
        <Stack borderLeft="faint" minWidth="200">
            <Stack gap="sm" padding="sm">
                {roles.map((r) => {
                    const selected = role === r.id
                    return (
                        <SpaceSettingsRolesNavItem
                            role={r}
                            key={r.id}
                            selected={selected}
                            onRemoveRole={onRemoveRole}
                        />
                    )
                })}
                <SpaceSettingsNavItem color="gray2" padding="xs" onClick={onAddRole}>
                    <Icon
                        type="plus"
                        background="level2"
                        padding="sm"
                        size="square_lg"
                        color="gray2"
                    />
                    Create new role
                </SpaceSettingsNavItem>
            </Stack>
        </Stack>
    )
}
