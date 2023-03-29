import { SpaceProtocol } from '../../client/ZionClientTypes'
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
import { RoomMember, Membership } from '../../types/zion-types'
import { RoomIdentifier } from '../../types/room-identifier'
import { useZionContext } from '../../components/ZionContextProvider'

/// useMember provides the current membership state, displayname, avatar, etc of a user in a room.
/// note: it might be useful to combine with useUser, which provides the basic user info.
export function useMatrixRoomMember(
    roomId?: RoomIdentifier,
    userId?: string,
): RoomMember | undefined {
    const { matrixClient } = useZionContext()
    const [roomMember, setRoomMember] = useState<RoomMember>()

    useEffect(() => {
        if (roomId?.protocol !== SpaceProtocol.Matrix) {
            return
        }
        if (!matrixClient || !userId || !roomId) {
            return
        }
        // helpers
        const updateState = (inRoomMember?: MatrixRoomMember) => {
            const matrixMember =
                inRoomMember ?? matrixClient.getRoom(roomId.networkId)?.getMember(userId)
            const matrixMembership = matrixMember?.membership
            const membership = (matrixMembership as Membership) ?? Membership.None
            const name = matrixMember?.name ?? ''
            const rawDisplayName = matrixMember?.rawDisplayName ?? ''
            const disambiguate = matrixMember?.disambiguate ?? false
            const avatarUrl = matrixMember?.getMxcAvatarUrl() ?? undefined
            setRoomMember((prev) => {
                if (
                    prev?.userId !== userId ||
                    prev?.name !== name ||
                    prev?.rawDisplayName !== rawDisplayName ||
                    prev?.avatarUrl !== avatarUrl ||
                    prev?.disambiguate !== disambiguate ||
                    prev?.membership !== membership
                ) {
                    return {
                        userId,
                        name,
                        rawDisplayName,
                        membership,
                        disambiguate,
                        avatarUrl,
                    } satisfies RoomMember
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
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            oldMembership?: string | null,
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

        matrixClient.on(ClientEvent.Room, onRoomEvent)
        matrixClient.on(RoomMemberEvent.Membership, onRoomMembership)
        matrixClient.on(RoomMemberEvent.Name, onRoomMembership)
        matrixClient.on(RoomStateEvent.Members, onMembersUpdated)
        matrixClient.on(RoomStateEvent.NewMember, onMembersUpdated)

        return () => {
            matrixClient.off(ClientEvent.Room, onRoomEvent)
            matrixClient.off(RoomMemberEvent.Membership, onRoomMembership)
            matrixClient.off(RoomMemberEvent.Name, onRoomMembership)
            matrixClient.off(RoomStateEvent.Members, onMembersUpdated)
            matrixClient.off(RoomStateEvent.NewMember, onMembersUpdated)
            setRoomMember(undefined)
        }
    }, [matrixClient, userId, roomId])
    return roomMember
}
