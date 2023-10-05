import { isValidStreamId as isValidCasablancaStreamId } from '@river/sdk'

// TODO: rename to StreamIdentifier
export type RoomIdentifier = {
    slug: string
    networkId: string
}

export function toRoomIdentifier(slugOrId: string | RoomIdentifier | undefined) {
    if (!slugOrId) {
        return undefined
    }
    if (typeof slugOrId === 'string') {
        if (!isValidCasablancaStreamId(slugOrId)) {
            return undefined
        }
        return makeRoomIdentifierFromSlug(slugOrId)
    }
    return slugOrId
}

// TODO: rename to makeStreamIdentifier
export function makeRoomIdentifier(roomId: string): RoomIdentifier {
    return {
        slug: encodeURIComponent(roomId),
        networkId: roomId,
    }
}

export function makeRoomIdentifierFromSlug(slug: string): RoomIdentifier {
    const roomId = decodeURIComponent(slug)
    return makeRoomIdentifier(roomId)
}
