import {
    ClientEvent,
    EventType,
    IRoomTimelineData,
    MatrixClient,
    MatrixEvent,
    Room as MatrixRoom,
    RoomEvent,
    RoomMember as MatrixRoomMember,
    RoomState,
    RoomStateEvent,
} from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { toZionRoom } from '../../store/use-matrix-store'
import { Room } from '../../types/zion-types'
import isEqual from 'lodash/isEqual'

export function useMatrixRooms(client?: MatrixClient): Record<string, Room | undefined> {
    const [rooms, setRooms] = useState<Record<string, Room | undefined>>({})

    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        const updateState = (roomId: string) => {
            const matrixRoom = client.getRoom(roomId)
            const newRoom = matrixRoom ? toZionRoom(matrixRoom) : undefined
            setRooms((prev) =>
                isEqual(prev[roomId], newRoom) ? prev : { ...prev, [roomId]: newRoom },
            )
        }

        const setInitialState = () => {
            const initialState = client
                .getRooms()
                .reduce((acc: Record<string, Room | undefined>, room: MatrixRoom) => {
                    acc[room.roomId] = toZionRoom(room)
                    return acc
                }, {})
            setRooms(initialState)
        }

        // initial state
        setInitialState()

        // subscribe to changes
        const onMembersUpdated = (
            event: MatrixEvent,
            roomState: RoomState,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            member: MatrixRoomMember,
        ) => {
            updateState(roomState.roomId)
        }
        const onRoomEvent = (room: MatrixRoom) => {
            updateState(room.roomId)
        }
        const onRoomTimelineEvent = (
            event: MatrixEvent,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            room: MatrixRoom | undefined,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            toStartOfTimeline: boolean | undefined,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            removed: boolean,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            data: IRoomTimelineData,
        ) => {
            // if the room is a space update our spaces
            const eventRoomId = event.getRoomId()
            if (!eventRoomId) {
                return
            }
            const eventType = event.getType() as EventType
            if (
                eventType === EventType.RoomCreate ||
                eventType === EventType.RoomName ||
                eventType === EventType.RoomAvatar ||
                eventType === EventType.RoomTopic
            ) {
                updateState(eventRoomId)
            } else if (
                eventType === EventType.RoomMember &&
                event.getStateKey() === client.getUserId()
            ) {
                updateState(eventRoomId)
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
            setRooms({})
        }
    }, [client])
    return rooms
}
