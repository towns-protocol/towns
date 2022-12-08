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
    const matrixRoomId = typeof spaceId === 'string' ? spaceId : spaceId.matrixRoomId
    const matrixRoom = client.getRoom(matrixRoomId) || new MatrixRoom(matrixRoomId, client, userId)
    const roomHierarchy = new RoomHierarchy(matrixRoom)
    try {
        while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
            console.log('syncing space', matrixRoomId)
            await roomHierarchy.load()
        }
    } catch (reason) {
        console.error('syncing space error', matrixRoomId, reason)
    }
    const root = roomHierarchy.rooms
        ? roomHierarchy.rooms.find((r) => r.room_id === matrixRoomId)
        : undefined
    const children = roomHierarchy.rooms
        ? roomHierarchy.rooms.filter((r) => r.room_id !== matrixRoomId)
        : []
    if (!root) {
        console.error('syncing space error', matrixRoomId, 'no root', roomHierarchy)
        return undefined
    }
    return { root: root, children: children }
}
