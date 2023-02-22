import React from 'react'
import { useParams } from 'react-router'
import useEvent from 'react-use-event-hook'
import { Paragraph, Stack, Toggle } from '@ui'
import { useSpaceSettingsStore } from 'store/spaceSettingsStore'
import { enabledRolePermissions, rolePermissionDescriptions } from './rolePermissions.const'

type PermissionMeta = (typeof rolePermissionDescriptions)[(typeof enabledRolePermissions)[number]]

export const RoleSettingsPermissions = () => {
    const { role: roleId = '' } = useParams()
    const getRole = useSpaceSettingsStore((state) => state.getRole)
    const role = getRole(roleId)

    const setPermission = useSpaceSettingsStore((state) => state.setPermission)
    const onToggleRole = useEvent((permissionId: string, value: boolean) => {
        if (roleId) {
            setPermission(roleId, permissionId, value)
        }
    })

    return (
        <Stack gap="x4" key={roleId}>
            {enabledRolePermissions.map((permissionId: (typeof enabledRolePermissions)[number]) => (
                <RoleRow
                    id={permissionId}
                    defaultToggled={!!role?.permissions.includes(permissionId)}
                    metaData={rolePermissionDescriptions[permissionId]}
                    key={permissionId}
                    onToggle={onToggleRole}
                />
            ))}
        </Stack>
    )
}

type RoleProps = {
    id: string
    defaultToggled: boolean
    metaData: PermissionMeta
    onToggle: (id: string, value: boolean) => void
}

const RoleRow = (props: RoleProps) => {
    const { id, metaData, defaultToggled } = props
    const [checked, setChecked] = React.useState(defaultToggled)
    const onToggle = (checked: boolean) => {
        setChecked(checked)
        props.onToggle(id, checked)
    }
    return (
        <Stack horizontal grow gap as="label">
            <Stack grow>
                <Paragraph strong>{metaData.name}</Paragraph>
                <Paragraph color="gray2">{metaData.description}</Paragraph>
            </Stack>
            <Stack centerContent>
                <Toggle toggled={checked} onToggle={onToggle} />
            </Stack>
        </Stack>
    )
}
