import { ClientEvent, EventType, MatrixEvent, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import { useEffect, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { PowerLevels } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import { enrichPowerLevels } from '../client/matrix/PowerLevels'
import { SpaceProtocol } from '../client/ZionClientTypes'

export const usePowerLevels = (roomId: RoomIdentifier | undefined): PowerLevels => {
    const { matrixClient } = useZionContext()
    const [powerLevels, setPowerLevels] = useState<PowerLevels>(enrichPowerLevels())

    useEffect(() => {
        if (roomId?.protocol !== SpaceProtocol.Matrix) {
            return
        }
        // precondition
        if (!matrixClient || !roomId) {
            return
        }
        // helpers
        const updateState = () => {
            const matrixRoom = matrixClient.getRoom(roomId.networkId)
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
        const onRoomTimelineEvent = (event: MatrixEvent, eventRoom: MatrixRoom | undefined) => {
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
    }, [matrixClient, roomId])
    return powerLevels
}
