import { EventType, MatrixClient } from 'matrix-js-sdk'
import { sleepUntil } from '../../utils/zion-utils'
import { MatrixRoomIdentifier } from '../../types/room-identifier'

export const joinMatrixRoom = async (props: {
    matrixClient: MatrixClient
    roomId: MatrixRoomIdentifier
}) => {
    const { matrixClient, roomId } = props
    const opts = {
        syncRoom: true,
    }
    const shitMatrixRoom = await matrixClient.joinRoom(roomId.networkId, opts)
    // matrix is shit, when you join a room, it doesn't save the instance in the data store
    // so when we sync the room, it creates a new one, and we want to wait for that one to
    // be populated with the room state
    await sleepUntil(
        this,
        () =>
            matrixClient
                ?.getRoom(roomId.networkId)
                ?.getLiveTimeline()
                .getEvents()
                .find((e) => e.getType() === EventType.RoomCreate) !== undefined,
        5000,
        20,
    )
    // get the good room
    const matrixRoom = matrixClient.getRoom(roomId.networkId)
    return matrixRoom ?? shitMatrixRoom
}
