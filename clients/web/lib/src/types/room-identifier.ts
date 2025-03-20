import { isValidStreamId as isValidCasablancaStreamId } from '@towns-protocol/sdk'

export function toRoomIdentifier(slugOrId: string | undefined) {
    if (!slugOrId) {
        return undefined
    }
    if (!isValidCasablancaStreamId(slugOrId)) {
        return undefined
    }
    return slugOrId
}
