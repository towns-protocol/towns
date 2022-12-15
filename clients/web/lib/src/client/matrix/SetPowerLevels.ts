import { EventType, ISendEventResponse, MatrixClient } from 'matrix-js-sdk'
import { PowerLevel } from '../../types/matrix-types'
import { MatrixRoomIdentifier } from '../../types/room-identifier'

export function setMatrixPowerLevel(
    matrixClient: MatrixClient,
    roomId: MatrixRoomIdentifier,
    current: PowerLevel,
    newValue: number,
): Promise<ISendEventResponse> {
    const room = matrixClient.getRoom(roomId.networkId)
    if (!room) {
        throw new Error(`Room ${roomId.networkId} not found`)
    }

    const powerLevelsEvent = room.currentState.getStateEvents(EventType.RoomPowerLevels, '')
    const def = current.definition
    const powerLevels = powerLevelsEvent ? powerLevelsEvent.getContent() : {}
    const newPowerLevels = { ...powerLevels }
    if (def.parent) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        newPowerLevels[def.parent] = {
            ...powerLevels[def.parent],
            [current.definition.key]: newValue,
        }
    } else {
        newPowerLevels[current.definition.key] = newValue
    }
    return matrixClient.sendStateEvent(roomId.networkId, EventType.RoomPowerLevels, newPowerLevels)
}
