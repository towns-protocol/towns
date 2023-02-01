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
    const matrixClient = client?.matrixClient
    const [powerLevels, setPowerLevels] = useState<PowerLevels>(enrichPowerLevels())

    useEffect(() => {
        // precondition
        if (!matrixClient || !roomId) {
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
            eventRoom: MatrixRoom | undefined,
            toStartOfTimeline: boolean | undefined,
            removed: boolean,
            data: IRoomTimelineData,
        ) => {
            const eventRoomId = event.getRoomId() ?? eventRoom?.roomId
            if (!eventRoomId) {
                return
            }
            // if the room is a space update our spaces
            if (roomId.networkId === eventRoomId) {
                const eventType = event.getType()
                if (eventType === EventType.RoomPowerLevels) {
                    updateState()
                }
            }
        }
        // subscribe to changes
        matrixClient.on(ClientEvent.Room, onRoomEvent)
        matrixClient.on(RoomEvent.Timeline, onRoomTimelineEvent)
        // cleanup
        return () => {
            matrixClient.off(ClientEvent.Room, onRoomEvent)
            matrixClient.off(RoomEvent.Timeline, onRoomTimelineEvent)
            setPowerLevels(enrichPowerLevels())
        }
    }, [client, matrixClient, roomId])
    return powerLevels
}
