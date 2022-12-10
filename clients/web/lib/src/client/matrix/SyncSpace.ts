import { MatrixClient, Room as MatrixRoom } from 'matrix-js-sdk'
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces'
import { RoomHierarchy } from 'matrix-js-sdk/lib/room-hierarchy'
import { RoomIdentifier } from '../../types/room-identifier'

export type MatrixSpaceHierarchy = {
    root: IHierarchyRoom
    children: IHierarchyRoom[]
}

export async function syncZionSpace(
    client: MatrixClient,
    spaceId: RoomIdentifier | string,
    userId: string,
): Promise<MatrixSpaceHierarchy | undefined> {
    const networkId = typeof spaceId === 'string' ? spaceId : spaceId.networkId
    const matrixRoom = client.getRoom(networkId) || new MatrixRoom(networkId, client, userId)
    const roomHierarchy = new RoomHierarchy(matrixRoom)
    try {
        while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
            console.log('syncing space', networkId)
            await roomHierarchy.load()
        }
    } catch (reason) {
        console.error('syncing space error', networkId, reason)
    }
    const root = roomHierarchy.rooms
        ? roomHierarchy.rooms.find((r) => r.room_id === networkId)
        : undefined
    const children = roomHierarchy.rooms
        ? roomHierarchy.rooms.filter((r) => r.room_id !== networkId)
        : []
    if (!root) {
        console.error('syncing space error', networkId, 'no root', roomHierarchy)
        return undefined
    }
    return { root: root, children: children }
}
