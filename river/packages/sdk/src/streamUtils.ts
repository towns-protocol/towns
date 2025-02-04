import {
    PersistedEvent,
    PersistedMiniblock,
    PersistedSyncedStream,
    SyncCookie,
} from '@river-build/proto'
import { ParsedEvent, ParsedMiniblock } from './types'
import { bin_toHexString } from '@river-build/dlog'
import { isDefined, logNever } from './check'

export interface ParsedPersistedSyncedStream {
    streamId: string
    syncCookie: SyncCookie
    lastSnapshotMiniblockNum: bigint
    minipoolEvents: ParsedEvent[]
    lastMiniblockNum: bigint
}

export function isPersistedEvent(event: ParsedEvent, direction: 'forward' | 'backward'): boolean {
    if (!event.event) {
        return false
    }

    switch (event.event.payload.case) {
        case 'channelPayload':
            return true
        case 'dmChannelPayload':
            return true
        case 'gdmChannelPayload':
            return true
        case 'mediaPayload':
            return true
        case 'userPayload':
            return direction === 'forward' ? true : false
        case 'userSettingsPayload':
            return direction === 'forward' ? true : false
        case 'miniblockHeader':
            return true
        case 'userMetadataPayload':
            return direction === 'forward' ? true : false
        case 'memberPayload': {
            switch (event.event.payload.value.content.case) {
                case 'keySolicitation':
                    return direction === 'forward' ? true : false
                case 'keyFulfillment':
                    return direction === 'forward' ? true : false
                case undefined:
                    return false
                default:
                    return direction === 'forward' ? true : false
            }
        }
        case 'spacePayload':
            return direction === 'forward' ? true : false
        case 'userInboxPayload':
            return direction === 'forward' ? true : false
        case undefined:
            return false
        default:
            logNever(event.event.payload, `unsupported event payload ${event.event.payload}`)
            return false
    }
}

export function persistedEventToParsedEvent(event: PersistedEvent): ParsedEvent | undefined {
    if (!event.event) {
        return undefined
    }
    return {
        event: event.event,
        hash: event.hash,
        hashStr: bin_toHexString(event.hash),
        signature: event.signature,
        prevMiniblockHashStr:
            event.prevMiniblockHashStr.length > 0 ? event.prevMiniblockHashStr : undefined,
        creatorUserId: event.creatorUserId,
    }
}

export function persistedMiniblockToParsedMiniblock(
    miniblock: PersistedMiniblock,
): ParsedMiniblock | undefined {
    if (!miniblock.header) {
        return undefined
    }
    return {
        hash: miniblock.hash,
        header: miniblock.header,
        events: miniblock.events.map(persistedEventToParsedEvent).filter(isDefined),
    }
}

export function parsedMiniblockToPersistedMiniblock(
    miniblock: ParsedMiniblock,
    direction: 'forward' | 'backward',
) {
    return new PersistedMiniblock({
        hash: miniblock.hash,
        header: miniblock.header,
        events: miniblock.events
            .filter((event) => isPersistedEvent(event, direction))
            .map(parsedEventToPersistedEvent),
    })
}

function parsedEventToPersistedEvent(event: ParsedEvent) {
    return new PersistedEvent({
        event: event.event,
        hash: event.hash,
        signature: event.signature,
        prevMiniblockHashStr: event.prevMiniblockHashStr,
        creatorUserId: event.creatorUserId,
    })
}

export function persistedSyncedStreamToParsedSyncedStream(
    streamId: string,
    stream: PersistedSyncedStream,
): ParsedPersistedSyncedStream | undefined {
    if (!stream.syncCookie) {
        return undefined
    }
    return {
        streamId,
        syncCookie: stream.syncCookie,
        lastSnapshotMiniblockNum: stream.lastSnapshotMiniblockNum,
        minipoolEvents: stream.minipoolEvents.map(persistedEventToParsedEvent).filter(isDefined),
        lastMiniblockNum: stream.lastMiniblockNum,
    }
}
