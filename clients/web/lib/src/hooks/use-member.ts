/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    ClientEvent,
    MatrixEvent,
    Room as MatrixRoom,
    RoomMember as MatrixRoomMember,
    RoomMemberEvent,
    RoomState,
    RoomStateEvent,
} from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { RoomMember, Membership } from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'

/// useMember provides the current membership state, displayname, avatar, etc of a user in a room.
/// note: it might be useful to combine with useUser, which provides the basic user info.
export function useMember(roomId?: RoomIdentifier, userId?: string): RoomMember | undefined {
    const { client } = useZionContext()
    const [roomMember, setRoomMember] = useState<RoomMember>()

    useEffect(() => {
        if (!client || !userId || !roomId) {
            return
        }
        // helpers
        const updateState = (inRoomMember?: MatrixRoomMember) => {
            const matrixMember =
                inRoomMember ?? client?.getRoom(roomId.networkId)?.getMember(userId)
            const matrixMembership = matrixMember?.membership
            const membership = (matrixMembership as Membership) ?? Membership.None
            const name = matrixMember?.name ?? ''
            const avatarUrl = matrixMember?.getMxcAvatarUrl() ?? undefined
            setRoomMember((prev) => {
                if (
                    prev?.userId !== userId ||
                    prev?.name !== name ||
                    prev?.avatarUrl !== avatarUrl ||
                    prev?.membership !== membership
                ) {
                    return {
                        userId,
                        name,
                        membership,
                        avatarUrl,
                    }
                }
                return prev
            })
        }
        // initial state
        updateState()

        // subscribe to changes
        const onMembersUpdated = (
            event: MatrixEvent,
            roomState: RoomState,
            member: MatrixRoomMember,
        ) => {
            if (member.userId === userId && roomState.roomId === roomId.networkId) {
                updateState(member)
            }
        }
        const onRoomMembership = (
            event: MatrixEvent,
            member: MatrixRoomMember,
            oldMembership: string | null,
        ) => {
            if (member.userId === userId && event.getRoomId() === roomId.networkId) {
                updateState(member)
            }
        }
        const onRoomEvent = (room: MatrixRoom) => {
            if (room.roomId === roomId.networkId) {
                updateState()
            }
        }

        client.matrixClient.on(ClientEvent.Room, onRoomEvent)
        client.matrixClient.on(RoomMemberEvent.Membership, onRoomMembership)
        client.matrixClient.on(RoomMemberEvent.Name, onRoomMembership)
        client.matrixClient.on(RoomStateEvent.Members, onMembersUpdated)
        client.matrixClient.on(RoomStateEvent.NewMember, onMembersUpdated)

        return () => {
            client.matrixClient.off(ClientEvent.Room, onRoomEvent)
            client.matrixClient.off(RoomMemberEvent.Membership, onRoomMembership)
            client.matrixClient.off(RoomMemberEvent.Name, onRoomMembership)
            client.matrixClient.off(RoomStateEvent.Members, onMembersUpdated)
            client.matrixClient.off(RoomStateEvent.NewMember, onMembersUpdated)
            setRoomMember(undefined)
        }
    }, [client, userId, roomId])
    return roomMember
}
