import { MiniblockHeader, StreamEvent, SyncCookie } from '@river-build/proto'

export interface ParsedMiniblock {
    hash: Uint8Array
    header: MiniblockHeader
    events: ParsedEvent[]
}

export interface ParsedStreamAndCookie {
    nextSyncCookie: SyncCookie
    miniblocks: ParsedMiniblock[]
    events: ParsedEvent[]
}

export interface ParsedEvent {
    event: StreamEvent
    hash: Uint8Array
    hashStr: string
    prevMiniblockHashStr?: string
    creatorUserId: string
}

export interface ParsedStreamResponse {
    // snapshot: Snapshot
    streamAndCookie: ParsedStreamAndCookie
    prevSnapshotMiniblockNum: bigint
    eventIds: string[]
}
