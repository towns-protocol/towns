/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    ClientEvent,
    EventType,
    IRoomTimelineData,
    MatrixEvent,
    Room as MatrixRoom,
    RoomEvent,
    RoomMember as MatrixRoomMember,
    RoomState,
    RoomStateEvent,
} from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { toZionRoom } from '../store/use-matrix-store'
import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier, Room } from '../types/matrix-types'
import isEqual from 'lodash/isEqual'

export function useRoom(roomId?: RoomIdentifier): Room | undefined {
    const { client } = useZionContext()
    const [room, setRoom] = useState<Room>()

    useEffect(() => {
        if (!client || !roomId) {
            return
        }

        // helpers
        const updateState = () => {
            const matrixRoom = client.getRoom(roomId.matrixRoomId)
            const newRoom = matrixRoom ? toZionRoom(matrixRoom) : undefined
            setRoom((prev) => (isEqual(prev, newRoom) ? prev : newRoom))
        }
        // initial state
        updateState()

        // subscribe to changes
        const onMembersUpdated = (
            event: MatrixEvent,
            roomState: RoomState,
            member: MatrixRoomMember,
        ) => {
            if (roomState.roomId === roomId.matrixRoomId) {
                updateState()
            }
        }
        const onRoomEvent = (room: MatrixRoom) => {
            if (room.roomId === roomId.matrixRoomId) {
                updateState()
            }
        }
        const onRoomTimelineEvent = (
            event: MatrixEvent,
            room: MatrixRoom,
            toStartOfTimeline: boolean,
            removed: boolean,
            data: IRoomTimelineData,
        ) => {
            // if the room is a space update our spaces
            if (roomId.matrixRoomId == room.roomId) {
                const eventType = event.getType()
                if (
                    eventType === EventType.RoomCreate ||
                    eventType === EventType.RoomName ||
                    eventType === EventType.RoomAvatar
                ) {
                    updateState()
                } else if (
                    eventType === EventType.RoomMember &&
                    event.getStateKey() === client.getUserId()
                ) {
                    updateState()
                }
            }
        }

        client.on(ClientEvent.Room, onRoomEvent)
        client.on(RoomEvent.Name, onRoomEvent)
        client.on(RoomStateEvent.Members, onMembersUpdated)
        client.on(RoomStateEvent.NewMember, onMembersUpdated)
        client.on(RoomEvent.Timeline, onRoomTimelineEvent)

        return () => {
            client.off(ClientEvent.Room, onRoomEvent)
            client.off(RoomEvent.Name, onRoomEvent)
            client.off(RoomStateEvent.Members, onMembersUpdated)
            client.off(RoomStateEvent.NewMember, onMembersUpdated)
            client.off(RoomEvent.Timeline, onRoomTimelineEvent)
            setRoom(undefined)
        }
    }, [client, roomId])
    return room
}
