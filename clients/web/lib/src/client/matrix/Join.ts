import { MatrixClient } from 'matrix-js-sdk'
import { MatrixRoomIdentifier } from '../../types/room-identifier'

export const joinMatrixRoom = async (props: {
    matrixClient: MatrixClient
    roomId: MatrixRoomIdentifier
}) => {
    const { matrixClient, roomId } = props
    const opts = {
        syncRoom: true,
    }
    return await matrixClient.joinRoom(roomId.networkId, opts)
}
