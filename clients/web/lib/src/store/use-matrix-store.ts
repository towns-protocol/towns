import { AuthenticationError, LoginStatus } from '../hooks/login'
import { makeRoomIdentifier, Membership, Room, RoomMember, SpaceChild } from '../types/matrix-types'
import create, { SetState, StateCreator } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'

import { Room as MatrixRoom } from 'matrix-js-sdk'
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import { ZionClientEvent } from 'client/ZionClientTypes'

export type MatrixStoreStates = {
    isAuthenticated: boolean
    deviceId: string | null
    setDeviceId: (deviceId: string | undefined) => void
    loginStatus: LoginStatus
    setLoginStatus: (loginStatus: LoginStatus) => void
    loginError: AuthenticationError | null
    setLoginError: (error: AuthenticationError | undefined) => void
    userId: string | null
    setUserId: (userId: string | undefined) => void
    username: string | null
    setUsername: (username: string | undefined) => void
    zionClientEvents: { [event in ZionClientEvent]?: number }
    triggerZionClientEvent: (event: ZionClientEvent) => void
}

type MyPersist = (
    config: StateCreator<MatrixStoreStates>,
    options: PersistOptions<MatrixStoreStates>,
) => StateCreator<MatrixStoreStates>

export const useMatrixStore = create<MatrixStoreStates>(
    (persist as unknown as MyPersist)(
        (set: SetState<MatrixStoreStates>) => ({
            isAuthenticated: false,
            loginStatus: LoginStatus.LoggedOut,
            setLoginStatus: (loginStatus: LoginStatus) =>
                loginStatus === LoginStatus.LoggedOut
                    ? set({
                          isAuthenticated: false,
                          deviceId: null,
                          loginStatus,
                          userId: null,
                          username: null,
                      })
                    : loginStatus === LoginStatus.LoggingIn
                    ? set({
                          isAuthenticated: false,
                          loginError: null,
                          loginStatus,
                      })
                    : set({
                          isAuthenticated: loginStatus === LoginStatus.LoggedIn,
                          loginStatus,
                      }),
            loginError: null,
            setLoginError: (error: AuthenticationError | undefined) =>
                set({ loginError: error ?? null }),
            deviceId: null,
            setDeviceId: (deviceId: string | undefined) => set({ deviceId: deviceId ?? null }),
            userId: null,
            setUserId: (userId: string | undefined) => set({ userId: userId ?? null }),
            username: null,
            setUsername: (username: string | undefined) => set({ username: username ?? null }),
            zionClientEvents: {},
            triggerZionClientEvent: (event: ZionClientEvent) =>
                set((state: MatrixStoreStates) => triggerZionClientEvent(state, event)),
        }),
        {
            // default store uses localStorage
            name: 'matrix-store',
            getStorage: () => localStorage,
        },
    ),
)

function triggerZionClientEvent(state: MatrixStoreStates, event: ZionClientEvent) {
    const changed = { ...state.zionClientEvents }
    changed[event] = Date.now()
    return { zionClientEvents: changed }
}

export function toZionRoom(r: MatrixRoom): Room {
    const { members, membersMap } = toZionMembers(r)
    return {
        id: makeRoomIdentifier(r.roomId),
        name: r.name,
        membership: r.getMyMembership() as Membership,
        inviter: r.getMyMembership() === Membership.Invite ? r.guessDMUserId() : undefined,
        members: members,
        membersMap: membersMap,
        isSpaceRoom: r.isSpaceRoom(),
    }
}

function toZionMembers(r: MatrixRoom): {
    members: RoomMember[]
    membersMap: { [userId: string]: RoomMember }
} {
    const members: RoomMember[] = r.getMembersWithMembership(Membership.Join).map((x) => ({
        userId: x.userId,
        name: x.name,
        membership: Membership.Join,
        avatarUrl: x.getMxcAvatarUrl() ?? undefined,
    }))

    const membersMap = members.reduce((result, x) => {
        result[x.userId] = x
        return result
    }, {} as { [userId: string]: RoomMember })
    return { members, membersMap }
}

export function toZionSpaceChild(r: IHierarchyRoom): SpaceChild {
    return {
        id: makeRoomIdentifier(r.room_id),
        name: r.name ?? 'Unknown',
        avatarUrl: r.avatar_url,
        topic: r.topic,
        canonicalAlias: r.canonical_alias,
        aliases: r.aliases,
        worldReadable: r.world_readable,
        guestCanJoin: r.guest_can_join,
        numjoinedMembers: r.num_joined_members,
    }
}
