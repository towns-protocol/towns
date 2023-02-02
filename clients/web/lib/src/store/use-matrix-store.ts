import { AuthenticationError, LoginStatus } from '../hooks/login'
import { Membership, Room, RoomMember, SpaceChild } from '../types/zion-types'
import { makeRoomIdentifier, makeMatrixRoomIdentifier } from '../types/room-identifier'
import create, { SetState } from 'zustand'

import { Room as MatrixRoom } from 'matrix-js-sdk'
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import { ZionClientEvent } from '../client/ZionClientTypes'

export type MatrixStoreStates = {
    loginStatus: LoginStatus
    setLoginStatus: (loginStatus: LoginStatus) => void
    loginError: AuthenticationError | null
    setLoginError: (error: AuthenticationError | undefined) => void
    zionClientEvents: { [event in ZionClientEvent]?: number }
    triggerZionClientEvent: (event: ZionClientEvent) => void
}

export const useMatrixStore = create<MatrixStoreStates>((set: SetState<MatrixStoreStates>) => ({
    isAuthenticated: false,
    loginStatus: LoginStatus.LoggedOut,
    setLoginStatus: (loginStatus: LoginStatus) =>
        loginStatus === LoginStatus.LoggedOut
            ? set({
                  loginStatus,
              })
            : loginStatus === LoginStatus.LoggingIn
            ? set({
                  loginError: null,
                  loginStatus,
              })
            : set({
                  loginStatus,
              }),
    loginError: null,
    setLoginError: (error: AuthenticationError | undefined) => set({ loginError: error ?? null }),
    zionClientEvents: {},
    triggerZionClientEvent: (event: ZionClientEvent) =>
        set((state: MatrixStoreStates) => triggerZionClientEvent(state, event)),
}))

function triggerZionClientEvent(state: MatrixStoreStates, event: ZionClientEvent) {
    const changed = { ...state.zionClientEvents }
    changed[event] = Date.now()
    return { zionClientEvents: changed }
}

export function toZionRoom(r: MatrixRoom): Room {
    const { members, membersMap } = toZionMembers(r)

    // if user is invited to room, r.getMyMembership() always returns "invite" until browser refresh, even if they accept and join room
    // once they're in membersMap, their status is set to join
    const myMembership = membersMap[r.myUserId]?.membership ?? (r.getMyMembership() as Membership)
    return {
        id: makeRoomIdentifier(r.roomId),
        name: r.name,
        membership: myMembership,
        inviter: myMembership === Membership.Invite ? r.guessDMUserId() : undefined,
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
        rawDisplayName: x.rawDisplayName,
        membership: Membership.Join,
        disambiguate: x.disambiguate,
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
        id: makeMatrixRoomIdentifier(r.room_id),
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
