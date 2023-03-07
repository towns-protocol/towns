import { Permission } from 'use-zion-client'
import { create } from 'zustand'
import { combine } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type SpaceSettings = {
    spaceId: string
    roles: Role[]
}

export type Role = {
    id: string
    name: string
    color?: string
    permissions: Permission[]
    tokens: string[]
    users: string[]
}

const createRole = (id: string, name: string, color?: string): Role => ({
    id,
    name,
    color: '1',
    permissions: [Permission.Read],
    tokens: [],
    users: [],
})

export const useSpaceSettingsStore = create(
    immer(
        combine(
            {
                space: undefined,
            } as { space?: SpaceSettings },
            (set, get) => ({
                clearSpace: () => {
                    set((state) => {
                        state.space = undefined
                    })
                },

                setSpace: (settings: SpaceSettings) => {
                    set((state) => {
                        state.space = settings
                    })
                    return settings
                },

                getDefaultRole: () => {
                    return get().space?.roles.at(0)
                },

                addRole: (role: Partial<Role> & Pick<Role, 'name' | 'id'>) => {
                    set((state) => {
                        state.space?.roles.push(createRole(role.id, role.name))
                    })
                },

                removeRole: (roleId: string) => {
                    set((state) => {
                        const roles = state.space?.roles
                        const index = roles?.findIndex((role) => role.id === roleId) ?? -1
                        if (index > -1) {
                            roles?.splice(index, 1)
                        }
                    })
                },
                setRoleName: (roleId: string, name: string) => {
                    set((state) => {
                        const role = state.space?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.name = name
                        }
                    })
                },
                setRoleColor: (roleId: string, color: string) => {
                    set((state) => {
                        const role = state.space?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.color = color
                        }
                    })
                },
                getRole: (roleId: string) => {
                    return get().space?.roles.find((role) => role.id === roleId)
                },
                setPermission: (roleId: string, permissionId: Permission, value: boolean) => {
                    set((state) => {
                        const role = state.space?.roles.find((role) => role.id === roleId)
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
                        const role = state.space?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.users = users
                        }
                    })
                },
                setTokens: (roleId: string, tokens: string[]) => {
                    set((state) => {
                        const role = state.space?.roles.find((role) => role.id === roleId)
                        if (role) {
                            role.tokens = tokens
                        }
                    })
                },
            }),
        ),
    ),
)
