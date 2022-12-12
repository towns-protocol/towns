/* eslint-disable @typescript-eslint/no-unused-vars */
import {
    ClientEvent,
    EventType,
    IRoomTimelineData,
    MatrixEvent,
    Room as MatrixRoom,
    RoomEvent,
} from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { PowerLevels } from '../types/matrix-types'
import { RoomIdentifier } from '../types/room-identifier'
import { enrichPowerLevels } from '../client/matrix/PowerLevels'

export const usePowerLevels = (roomId: RoomIdentifier | undefined): PowerLevels => {
    const { client } = useZionContext()
    const [powerLevels, setPowerLevels] = useState<PowerLevels>(enrichPowerLevels())

    useEffect(() => {
        // precondition
        if (!client || !roomId) {
            return
        }
        // helpers
        const updateState = () => {
            const matrixRoom = client.getRoom(roomId)
            const powerLevelsEvent = matrixRoom?.currentState.getStateEvents(
                EventType.RoomPowerLevels,
                '',
            )
            const powerLevelsMap = powerLevelsEvent ? powerLevelsEvent.getContent() : {}
            setPowerLevels(enrichPowerLevels(powerLevelsMap))
        }
        // initial state
        updateState()
        // event listeners
        const onRoomEvent = (room: MatrixRoom) => {
            if (room.roomId === roomId.networkId) {
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
            if (roomId.networkId == room.roomId) {
                const eventType = event.getType()
                if (eventType === EventType.RoomPowerLevels) {
                    updateState()
                }
            }
        }
        // subscribe to changes
        client.matrixClient.on(ClientEvent.Room, onRoomEvent)
        client.matrixClient.on(RoomEvent.Timeline, onRoomTimelineEvent)
        // cleanup
        return () => {
            client.matrixClient.off(ClientEvent.Room, onRoomEvent)
            client.matrixClient.off(RoomEvent.Timeline, onRoomTimelineEvent)
            setPowerLevels(enrichPowerLevels())
        }
    }, [client, roomId])
    return powerLevels
}
