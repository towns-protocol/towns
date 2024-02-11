import React, { useEffect } from 'react'
import { Permission } from '@river/web3'
import { Paragraph, Stack, Toggle } from '@ui'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'
import { rolePermissionDescriptions } from './rolePermissions.const'

type PermissionMeta = (typeof rolePermissionDescriptions)[keyof typeof rolePermissionDescriptions]

export type Role = {
    id: string
    name: string
    color?: string
    permissions: Permission[]
    tokens: TokenDataStruct[]
    users: string[]
}

type RoleProps = {
    permissionId: Permission
    role: Role
    defaultToggled: boolean
    metaData: PermissionMeta
    onToggle: (id: Permission, value: boolean) => void
}

export const RoleRow = (props: RoleProps) => {
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
