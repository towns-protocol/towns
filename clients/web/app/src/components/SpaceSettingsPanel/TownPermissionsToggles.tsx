import { useFormContext } from 'react-hook-form'
import { Address, Permission, useRoleDetails } from 'use-towns-client'
import React, { useState } from 'react'
import { useEvent } from 'react-use-event-hook'
import { RoleFormSchemaType } from '../Web3/CreateSpaceForm/types'
import { PermissionToggle } from './PermissionToggle'
import { enabledTownPermissions, townPermissionDescriptions } from './rolePermissions.const'

export function TownPermissionsToggles({
    roleDetails,
}: {
    roleDetails: ReturnType<typeof useRoleDetails>['roleDetails']
}) {
    const { setValue, getValues } = useFormContext<RoleFormSchemaType>()

    // TODO: once SpaceSettings is gone and RoleRow lives here only, we can refactor RoleRow to just use the initial permissions of the form
    // and pass only the permissions to the row, no need to pass the whole role

    const [role, setRole] = useState(() => {
        // use the default form values, which map to the roleDetails
        const formValues = getValues()

        return {
            id: roleDetails?.id.toString() ?? '',
            name: formValues.name,
            permissions: formValues.townPermissions ?? [],
            tokensGatedBy: formValues.tokensGatedBy ?? [],
            usersGatedBy: (formValues.usersGatedBy as Address[]) ?? [],
        }
    })

    const onToggleTownPermissions = useEvent((permissionId: Permission, value: boolean) => {
        const currentPermissions = role.permissions
        const newPermissions = value
            ? currentPermissions.concat(permissionId)
            : currentPermissions.filter((p) => p !== permissionId)

        setRole((role) => ({
            ...role,
            permissions: newPermissions,
        }))

        setValue('townPermissions', newPermissions)
    })

    return enabledTownPermissions.map((permissionId: Permission) => {
        return role ? (
            <PermissionToggle
                permissionId={permissionId}
                defaultToggled={!!role?.permissions?.includes(permissionId)}
                metaData={townPermissionDescriptions[permissionId]}
                key={permissionId}
                disabled={townPermissionDescriptions[permissionId]?.disabled}
                onToggle={onToggleTownPermissions}
            />
        ) : null
    })
}
