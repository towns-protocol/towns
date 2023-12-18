import { isValidStreamId as isValidCasablancaStreamId } from '@river/sdk'

// TODO: rename to StreamIdentifier
export type RoomIdentifier = {
    streamId: string
}

export function toRoomIdentifier(slugOrId: string | RoomIdentifier | undefined) {
    if (!slugOrId) {
        return undefined
    }
    if (typeof slugOrId === 'string') {
        if (!isValidCasablancaStreamId(slugOrId)) {
            return undefined
        }
        return { streamId: slugOrId }
    }
    return slugOrId
}

// TODO: rename to makeStreamIdentifier
export function makeRoomIdentifier(roomId: string): RoomIdentifier {
    return {
        streamId: roomId,
    }
}
