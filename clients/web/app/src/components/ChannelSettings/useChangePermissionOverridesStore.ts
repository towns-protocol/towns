import { Permission } from 'use-towns-client'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

type PermissionOverriedState = {
    channels: Record<string, { roles: Record<number, { permissions: Permission[] | undefined }> }>
    setPermissionOverrides: (
        channelFormId: string,
        roleId: number,
        permissions: Permission[] | undefined,
    ) => void
}

export const useChangePermissionOverridesStore = create<PermissionOverriedState>()(
    immer((set, get) => ({
        channels: {},
        getPermissionOverrides: (channelFormId: string, roleId: number) => {
            return get().channels[channelFormId]?.roles[roleId]?.permissions
        },
        setPermissionOverrides: (
            channelFormId: string,
            roleId: number,
            permissions: Permission[] | undefined,
        ) =>
            set((state) => {
                state.channels[channelFormId] = state.channels[channelFormId] ?? { roles: {} }
                state.channels[channelFormId].roles[roleId] = { permissions }
            }),
    })),
)
