import React, { useRef } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { IconLabelButton, Stack } from '@ui'
import { useSettingsRolesStore } from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { SpaceSettingsRolesNavItem } from './SpaceSettingsRolesNavItem'
import { nonRemovableRoleIds } from './RoleSettings/rolePermissions.const'

export const NEW_ROLE_ID_PREFIX = 'n-'

export const SpaceSettingsRolesNav = () => {
    const { role } = useParams()
    const addRole = useSettingsRolesStore((state) => state.addRole)
    const removeRole = useSettingsRolesStore((state) => state.removeRole)
    const roles = useSettingsRolesStore((state) => state.modifiedSpace?.roles)
    const navigate = useNavigate()
    const newRolesRef = useRef(1)

    const onAddRole = useEvent(() => {
        const newId = `${NEW_ROLE_ID_PREFIX}${newRolesRef.current}`
        addRole({ id: newId, name: `New Role ${newRolesRef.current}` })
        navigate(`../roles/${newId}/display`)
        newRolesRef.current += 1
    })

    const onRemoveRole = useEvent((roleId: string) => {
        if (nonRemovableRoleIds.includes(+roleId)) {
            return
        }
        const nextRole = removeRole(roleId)
        navigate(`../roles/${nextRole ? nextRole : 'empty'}/permissions`)
    })

    return (
        <Stack borderLeft="faint" minWidth="200" data-testid="space-settings-roles-nav">
            <Stack gap="sm" padding="sm">
                {roles &&
                    roles.map((r) => {
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
                <IconLabelButton label="Create new role" icon="plus" onClick={onAddRole} />
            </Stack>
        </Stack>
    )
}
