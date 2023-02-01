import { MatrixClient } from 'matrix-js-sdk'
import { MatrixRoomIdentifier } from '../../types/room-identifier'

export const inviteMatrixUser = async (props: {
    matrixClient: MatrixClient
    roomId: MatrixRoomIdentifier
    userId: string
}) => {
    const { matrixClient, roomId, userId } = props
    await matrixClient.invite(roomId.networkId, userId.toLowerCase())
}
