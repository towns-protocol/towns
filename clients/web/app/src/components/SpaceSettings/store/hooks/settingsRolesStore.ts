import { Permission } from '@river/web3'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TokenDataStruct } from '@components/Web3/CreateSpaceForm/types'

export type SpaceSettings = {
    spaceId: string
    roles: Role[]
}

export type Role = {
    id: string
    name: string
    color?: string
    permissions: Permission[]
    tokens: TokenDataStruct[]
    users: string[]
}

const createRole = (id: string, name: string): Role => ({
    id,
    name,
    permissions: [Permission.Read],
    tokens: [],
    users: [],
})

// Manages the state of the roles for the space
// This store contains a snapshot of the roles when the space was loaded, and a duplicate of each role that contains changes
// This store does not track the status of any transactions to the blockchain
export const useSettingsRolesStore = create(
    immer(
        combine(
            {
                modifiedSpace: undefined as SpaceSettings | undefined,
                // the state of the space settings when it was first loaded
                spaceSnapshot: undefined as SpaceSettings | undefined,
            },
            (set, get) => ({
                clearSpace: () => {
                    set((state) => {
                        state.modifiedSpace = undefined
                        state.spaceSnapshot = undefined
                    })
                },

                setSpace: (settings: SpaceSettings) => {
                    set((state) => {
                        state.modifiedSpace = settings
                        state.spaceSnapshot = settings
                    })
                    return settings
                },

                resetRole: (roleId: string) => {
                    set((state) => {
                        if (!state.modifiedSpace || !state.spaceSnapshot) {
                            return
                        }

                        const updatedRole = state.modifiedSpace.roles.find(
                            (role) => role.id === roleId,
                        )
                        const snapshotRole = state.spaceSnapshot.roles.find(
                            (role) => role.id === roleId,
                        )

                        // remove the role if it was added
                        if (!snapshotRole && updatedRole) {
                            const index = state.modifiedSpace.roles.indexOf(updatedRole)
                            if (index !== undefined && index !== -1) {
                                state.modifiedSpace.roles.splice(index, 1)
                            }
                        }
                        // add the role back if it was deleted
                        if (!updatedRole && snapshotRole) {
                            state.modifiedSpace.roles.push(snapshotRole)
                        }

                        if (updatedRole && snapshotRole) {
                            Object.assign(updatedRole, snapshotRole)
                        }
                    })
                },

                getDefaultRole: () => {
                    return get().modifiedSpace?.roles.at(0)
                },

                addRole: (role: Partial<Role> & Pick<Role, 'name' | 'id'>) => {
                    set((state) => {
                        state.modifiedSpace?.roles.push(createRole(role.id, role.name))
                    })
                },

                removeRole: (roleId: string) => {
                    const roles = get().modifiedSpace?.roles
                    const index = roles?.findIndex((role) => role.id === roleId) ?? -1

                    set((state) => {
                        if (index > -1) {
                            state.modifiedSpace?.roles?.splice(index, 1)
                        }
                    })

                    const nextRole =
                        roles?.length === 1
                            ? undefined
                            : roles?.at(index + 1) ?? roles?.at(index - 1)
                    return nextRole?.id
                },
                setRoleName: (roleId: string, name: string) => {
                    set((state) => {
                        const role = state.modifiedSpace?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.name = name
                        }
                    })
                },
                setRoleColor: (roleId: string, color: string) => {
                    set((state) => {
                        const role = state.modifiedSpace?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.color = color
                        }
                    })
                },
                getRole: (roleId: string) => {
                    return get().modifiedSpace?.roles.find((role) => role.id === roleId)
                },
                setPermission: (roleId: string, permissionId: Permission, value: boolean) => {
                    set((state) => {
                        const role = state.modifiedSpace?.roles.find((role) => role.id === roleId)
                        if (!role) {
                            return
                        }
                        const { permissions } = role
                        if (value) {
                            if (!permissions.includes(permissionId)) {
                                permissions.push(permissionId)
                            }
                        } else {
                            const index = permissions.indexOf(permissionId)
                            if (index > -1) {
                                permissions.splice(index, 1)
                            }
                        }
                    })
                },

                setUsers: (roleId: string, users: string[]) => {
                    set((state) => {
                        const role = state.modifiedSpace?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.users = users
                        }
                    })
                },
                setTokens: (roleId: string, tokens: TokenDataStruct[]) => {
                    set((state) => {
                        const role = state.modifiedSpace?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.tokens = tokens
                        }
                    })
                },
            }),
        ),
    ),
)
