import { MatrixClient } from 'matrix-js-sdk'
import { RoomIdentifier } from '../../types/room-identifier'

export const joinZionRoom = async (props: {
    matrixClient: MatrixClient
    roomId: RoomIdentifier
}) => {
    const { matrixClient, roomId } = props
    const opts = {
        syncRoom: true,
    }
    return await matrixClient.joinRoom(roomId.networkId, opts)
}
