import React, { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { Address, Permission, useRoleDetails } from 'use-towns-client'
import { useEvent } from 'react-use-event-hook'
import {
    channelPermissionDescriptions,
    enabledChannelPermissions,
} from '@components/SpaceSettingsPanel/rolePermissions.const'
import { RoleFormSchemaType } from '../Web3/CreateSpaceForm/types'
import { PermissionToggle } from './PermissionToggle'

export function ChannelPermissionsToggles({
    roleDetails,
    onPermissionChange,
}: {
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails']
    onPermissionChange?: (permissions: Permission[]) => void
}) {
    const { setValue, getValues } = useFormContext<RoleFormSchemaType>()

    // use the default form values, which map to the roleDetails
    const formValues = getValues()

    // TODO: once SpaceSettings is gone and RoleRow lives here only, we can refactor RoleRow to just use the initial permissions of the form
    // and pass only the permissions to the row, no need to pass the whole role

    const [role, setRole] = useState(() => {
        return {
            id: roleDetails?.id.toString() ?? '',
            name: formValues.name,
            permissions: formValues.channelPermissions ?? [],
            tokensGatedBy: formValues.tokensGatedBy ?? [],
            usersGatedBy: (formValues.usersGatedBy as Address[]) ?? [],
            ethBalanceGatedBy: formValues.ethBalanceGatedBy ?? '',
        }
    })

    const onToggleChannelPermissions = useEvent((permissionId: Permission, isChecked: boolean) => {
        const newPermissions = createNewChannelPermissions(
            formValues.channelPermissions,
            permissionId,
            isChecked,
        )

        setRole((role) => ({
            ...role,
            permissions: newPermissions,
        }))

        setValue('channelPermissions', newPermissions)

        onPermissionChange?.(newPermissions)
    })

    return enabledChannelPermissions.map((permissionId: Permission) => {
        const isDisabled =
            permissionId === Permission.Read ||
            (permissionId === Permission.React && role.permissions.includes(Permission.Write))
        return role ? (
            <PermissionToggle
                permissionId={permissionId}
                defaultToggled={!!formValues.channelPermissions.includes(permissionId)}
                metaData={channelPermissionDescriptions[permissionId]}
                key={permissionId}
                disabled={isDisabled}
                onToggle={onToggleChannelPermissions}
            />
        ) : null
    })
}

function createNewChannelPermissions(
    permissions: Permission[],
    permissionId: Permission,
    value: boolean,
) {
    let _permissions: Permission[]
    if (permissionId === Permission.Write && value) {
        // add write + react - can't react w/o write
        _permissions = permissions.concat(permissionId, Permission.React)
    } else {
        _permissions = value
            ? permissions.concat(permissionId)
            : permissions.filter((p) => p !== permissionId)
    }
    return [...new Set(_permissions)]
}
