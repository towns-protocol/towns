import {
    PersistedEvent,
    PersistedMiniblock,
    PersistedSyncedStream,
    SyncCookie,
} from '@river-build/proto'
import { ParsedEvent, ParsedMiniblock } from './types'
import { bin_toHexString } from '@river-build/dlog'
import { isDefined } from './check'

export function persistedEventToParsedEvent(event: PersistedEvent): ParsedEvent | undefined {
    if (!event.event) {
        return undefined
    }
    return {
        event: event.event,
        hash: event.hash,
        hashStr: bin_toHexString(event.hash),
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

export function parsedMiniblockToPersistedMiniblock(miniblock: ParsedMiniblock) {
    return new PersistedMiniblock({
        hash: miniblock.hash,
        header: miniblock.header,
        events: miniblock.events.map(parsedEventToPersistedEvent),
    })
}

function parsedEventToPersistedEvent(event: ParsedEvent) {
    return new PersistedEvent({
        event: event.event,
        hash: event.hash,
        prevMiniblockHashStr: event.prevMiniblockHashStr,
        creatorUserId: event.creatorUserId,
    })
}

export function persistedSyncedStreamToParsedSyncedStream(stream: PersistedSyncedStream):
    | {
          syncCookie: SyncCookie
          lastSnapshotMiniblockNum: bigint
          minipoolEvents: ParsedEvent[]
          lastMiniblockNum: bigint
      }
    | undefined {
    if (!stream.syncCookie) {
        return undefined
    }
    return {
        syncCookie: stream.syncCookie,
        lastSnapshotMiniblockNum: stream.lastSnapshotMiniblockNum,
        minipoolEvents: stream.minipoolEvents.map(persistedEventToParsedEvent).filter(isDefined),
        lastMiniblockNum: stream.lastMiniblockNum,
    }
}
