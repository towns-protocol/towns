import { useMemo } from 'react'
import isEqual from 'lodash/isEqual'

import {
    Role,
    useSettingsRolesStore,
} from '@components/SpaceSettings/store/hooks/settingsRolesStore'

export const modifiedRoleTypes = {
    CreateRole: 'CreateRole',
    UpdateRole: 'UpdateRole',
    DeleteRole: 'DeleteRole',
} as const

export type ModifiedRoleType = (typeof modifiedRoleTypes)[keyof typeof modifiedRoleTypes]

export type ModifiedRole = {
    type: ModifiedRoleType
    metadata: Role
    changes: {
        title: string
        description: string
        shouldDisplay: boolean
    }[]
}

// Diffs the changes between the current state of the roles and the snapshot
// Returns an array of of modified roles, with each element representing a transaction to be submitted
export const useModifiedRoles = () => {
    const modifiedSpace = useSettingsRolesStore((state) => state.modifiedSpace)
    const spaceSnapshot = useSettingsRolesStore((state) => state.spaceSnapshot)

    const modifiedRoles = useMemo(() => {
        const roleChanges: ModifiedRole[] = []

        if (!spaceSnapshot || !modifiedSpace) {
            console.warn('space settings not comparable')
            return roleChanges
        }

        // check fo removed roles
        spaceSnapshot.roles?.reduce((changes, sr) => {
            const hasRole = modifiedSpace.roles.some((r) => r.id === sr.id)
            if (!hasRole) {
                changes.push({
                    type: modifiedRoleTypes.DeleteRole,
                    metadata: sr,
                    changes: [],
                })
            }
            return changes
        }, roleChanges)

        // check for new roles
        modifiedSpace.roles?.reduce((changes, r) => {
            const hasRole = spaceSnapshot.roles.some((sr) => sr.id === r.id)
            if (!hasRole) {
                changes.push({
                    type: modifiedRoleTypes.CreateRole,
                    metadata: r,
                    changes: [],
                })
            }
            return changes
        }, roleChanges)

        // check for role updates
        modifiedSpace.roles?.reduce((changes, r) => {
            const snapshotRole = spaceSnapshot.roles.find((sr) => sr.id === r.id)
            const role = modifiedSpace.roles.find((sr) => sr.id === r.id)

            if (role) {
                const updatesToRole = []

                if (role.name !== snapshotRole?.name) {
                    updatesToRole.push({
                        title: `Display name`,
                        description: `${role.name}`,
                        shouldDisplay: true,
                    })
                }
                // if (role.color !== snapshotRole?.color) {
                //     updatesToRole.push({
                //         title: `Role color updated`,
                //         description: `${role.name}: ${role.color}`,
                //     })
                // }
                if (
                    !isEqual(
                        role.permissions.slice().sort(),
                        snapshotRole?.permissions.slice().sort(),
                    )
                ) {
                    updatesToRole.push({
                        title: `Permissions for the role`,
                        description: `${role.permissions.join()}`,
                        shouldDisplay: role.permissions.length > 0,
                    })
                }
                if (!isEqual(role.tokens.slice().sort(), snapshotRole?.tokens.slice().sort())) {
                    let description = ''

                    role.tokens.forEach((token, index) => {
                        if (index > 0) {
                            description += ', '
                        }
                        description += `${token.contractAddress}`

                        if (token.tokenIds.length > 0) {
                            description += ` - Token IDs: ${token.tokenIds.join(', ')}`
                        }
                    })

                    updatesToRole.push({
                        title: `Token gated membership`,
                        description,
                        shouldDisplay: role.tokens.length > 0,
                    })
                }
                if (!isEqual(role.users.slice().sort(), snapshotRole?.users.slice().sort())) {
                    updatesToRole.push({
                        title: 'User gated membership',
                        description: `${role.users.join(', ')}`,
                        shouldDisplay: role.users.length > 0,
                    })
                }

                if (updatesToRole.length) {
                    const hasRole = changes.find((c) => c.metadata.id === role.id)
                    if (!hasRole) {
                        changes.push({
                            type: modifiedRoleTypes.UpdateRole,
                            metadata: role,
                            changes: updatesToRole,
                        })
                    } else {
                        hasRole.changes = [...hasRole.changes, ...updatesToRole]
                    }
                }
            }
            return changes
        }, roleChanges)

        return roleChanges
    }, [modifiedSpace, spaceSnapshot])

    return modifiedRoles
}
