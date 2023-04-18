import React, { useEffect } from 'react'
import { useParams } from 'react-router'
import { useEvent } from 'react-use-event-hook'
import { Permission } from 'use-zion-client'
import { Paragraph, Stack, Toggle } from '@ui'
import {
    Role,
    useSettingsRolesStore,
} from '@components/SpaceSettings/store/hooks/settingsRolesStore'
import { enabledRolePermissions, rolePermissionDescriptions } from './rolePermissions.const'

type PermissionMeta = (typeof rolePermissionDescriptions)[keyof typeof rolePermissionDescriptions]

export const RoleSettingsPermissions = () => {
    const { role: roleId = '' } = useParams()
    const role = useSettingsRolesStore((state) => state.getRole(roleId))

    const setPermission = useSettingsRolesStore((state) => state.setPermission)
    const onToggleRole = useEvent((permissionId: Permission, value: boolean) => {
        if (roleId) {
            setPermission(roleId, permissionId, value)
        }
    })

    return (
        <Stack gap="x4" key={roleId} data-testid="role-settings-permissions-content">
            {enabledRolePermissions.map((permissionId: Permission) => {
                return role ? (
                    <RoleRow
                        permissionId={permissionId}
                        role={role}
                        defaultToggled={!!role?.permissions.includes(permissionId)}
                        metaData={rolePermissionDescriptions[permissionId]}
                        key={permissionId}
                        onToggle={onToggleRole}
                    />
                ) : null
            })}
        </Stack>
    )
}

type RoleProps = {
    permissionId: Permission
    role: Role
    defaultToggled: boolean
    metaData: PermissionMeta
    onToggle: (id: Permission, value: boolean) => void
}

const RoleRow = (props: RoleProps) => {
    const { permissionId, metaData, defaultToggled, role } = props
    const [checked, setChecked] = React.useState(defaultToggled)
    const onToggle = (checked: boolean) => {
        props.onToggle(permissionId, checked)
    }

    // since a role can be reset to its default state (an individual permission can be toggled withtout user clicking this toggle)
    // listen to the role changes and update the toggle state accordingly
    useEffect(() => {
        if (!role) {
            return
        }
        const { permissions } = role
        setChecked(!!permissions.includes(permissionId))
    }, [permissionId, role])

    return (
        <Stack horizontal grow gap as="label">
            <Stack grow>
                <Paragraph strong>{metaData?.name}</Paragraph>
                <Paragraph color="gray2">{metaData?.description}</Paragraph>
            </Stack>
            <Stack centerContent>
                <Toggle toggled={checked} onToggle={onToggle} />
            </Stack>
        </Stack>
    )
}
