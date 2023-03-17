import React, { useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Icon, Stack } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { SpaceSettingsNavItem } from '../NavItem/SpaceSettingsNavItem'
import { SpaceSettingsRolesNavItem } from './SpaceSettingsRolesNavItem'

export const SpaceSettingsRolesNav = () => {
    const { role } = useParams()
    const addRole = useSettingsRolesStore((state) => state.addRole)
    const removeRole = useSettingsRolesStore((state) => state.removeRole)
    const roles = useSettingsRolesStore((state) => state.modifiedSpace?.roles)
    const navigate = useNavigate()
    const newRolesRef = useRef(1)

    const onAddRole = useEvent(() => {
        const newId = `n-${newRolesRef.current}`
        addRole({ id: newId, name: `New Role ${newRolesRef.current}` })
        navigate(`../roles/${newId}/display`)
        newRolesRef.current += 1
    })
    const getDefaultRole = useSettingsRolesStore((state) => state.getDefaultRole)

    const defaultPath = `../roles/${getDefaultRole()?.id}/permissions`

    const onRemoveRole = useEvent((roleId: string) => {
        removeRole(roleId)
        navigate(defaultPath)
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
