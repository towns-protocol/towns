import { EventType, MatrixClient } from 'matrix-js-sdk'
import { sleepUntil } from '../../utils/zion-utils'
import { MatrixRoomIdentifier } from '../../types/room-identifier'
import { removeSyncedEntitledChannelsQueriesForSpace } from '../../query/removeSyncedEntitledChannelQueries'

export const joinMatrixRoom = async (props: {
    matrixClient: MatrixClient
    roomId: MatrixRoomIdentifier
    parentNetworkId: string | undefined
}) => {
    const { matrixClient, roomId, parentNetworkId } = props
    const opts = {
        syncRoom: true,
    }

    if (parentNetworkId) {
        removeSyncedEntitledChannelsQueriesForSpace(parentNetworkId)
    }

    const notGoodMatrixRoom = await matrixClient.joinRoom(roomId.networkId, opts)
    // when you join a room, the room returned to you isn't saved in the data store
    // then when we get the room on the next sync, a new one is created,
    // we want to wait for that one to be populated with the room state
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
    return matrixRoom ?? notGoodMatrixRoom
}
