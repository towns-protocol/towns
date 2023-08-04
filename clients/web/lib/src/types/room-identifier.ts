import { isValidStreamId as isValidCasablancaStreamId } from '@river/sdk'
import { SpaceProtocol } from '../client/ZionClientTypes'

export type RoomIdentifier = MatrixRoomIdentifier | CasablancaStreamIdentifier

export interface MatrixRoomIdentifier {
    protocol: SpaceProtocol.Matrix
    slug: string
    networkId: string
}

export interface CasablancaStreamIdentifier {
    protocol: SpaceProtocol.Casablanca
    slug: string
    networkId: string
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
    if (isValidCasablancaStreamId(roomId)) {
        return makeCasablancaStreamIdentifier(roomId)
    } else {
        return makeMatrixRoomIdentifier(roomId)
    }
}

export function makeRoomIdentifierFromSlug(slug: string): RoomIdentifier {
    const roomId = decodeURIComponent(slug)
    return makeRoomIdentifier(roomId)
}

export function makeMatrixRoomIdentifier(roomId: string): MatrixRoomIdentifier {
    return {
        protocol: SpaceProtocol.Matrix,
        slug: encodeURIComponent(roomId), // TODO - this should be using matrixClient.getRoomIdForAlias, but didn't want to add another async loop here just yet
        networkId: roomId,
    }
}

export function makeCasablancaStreamIdentifier(roomId: string): CasablancaStreamIdentifier {
    return {
        protocol: SpaceProtocol.Casablanca,
        slug: encodeURIComponent(roomId),
        networkId: roomId,
    }
}
