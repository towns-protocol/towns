export interface RoomIdentifier {
    slug: string
    matrixRoomId: string
}

export function toRoomIdentifier(slugOrId: string | RoomIdentifier | undefined) {
    if (!slugOrId) {
        return undefined
    }
    if (typeof slugOrId === 'string') {
        return makeRoomIdentifierFromSlug(slugOrId)
    }
    return slugOrId
}

export function makeRoomIdentifier(roomId: string): RoomIdentifier {
    return {
        slug: encodeURIComponent(roomId.replace('.com', '-c0m-')), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
        matrixRoomId: roomId,
    }
}

export function makeRoomIdentifierFromSlug(slug: string): RoomIdentifier {
    return {
        slug: encodeURIComponent(decodeURIComponent(slug)), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
        matrixRoomId: decodeURIComponent(slug).replace('-c0m-', '.com'),
    }
}
