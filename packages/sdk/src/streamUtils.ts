import {
    MiniblockHeader,
    PersistedEvent,
    PersistedEventSchema,
    PersistedMiniblock,
    PersistedMiniblockSchema,
    PersistedSyncedStream,
    SyncCookie,
    PayloadCaseType,
    ContentCaseType,
    StreamEvent,
} from '@towns-protocol/proto'
import { ParsedEvent, ParsedMiniblock, ExclusionFilter } from './types'
import { bin_toHexString } from '@towns-protocol/utils'
import { create } from '@bufbuild/protobuf'
import { isDefined, logNever } from './check'
import { snakeCase } from 'lodash-es'

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
            switch (event.event.payload.value.content.case) {
                case 'blockchainTransaction':
                    return true
                case 'receivedBlockchainTransaction':
                    return true
                default:
                    return direction === 'forward' ? true : false
            }
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
                case 'memberBlockchainTransaction':
                    return true
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
        case 'metadataPayload':
            return false
        case undefined:
            return false
        default:
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
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
        creatorUserId: event.creatorUserId,
        ephemeral: false, // Persisted events are never ephemeral
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
    // always zero out the snapshot since we save it separately
    const header = {
        ...miniblock.header,
        snapshot: undefined,
        snapshotHash: computeBackwardsCompatibleSnapshotHash(miniblock.header),
    }

    return create(PersistedMiniblockSchema, {
        hash: miniblock.hash,
        header: header,
        events: miniblock.events
            .filter((event) => isPersistedEvent(event, direction))
            .map(parsedEventToPersistedEvent),
        // Note: partial property is not stored in PersistedMiniblock
    })
}

function parsedEventToPersistedEvent(event: ParsedEvent) {
    // always zero out the snapshot since we save it separately
    if (event.event?.payload.case === 'miniblockHeader') {
        event.event.payload.value = {
            ...event.event.payload.value,
            snapshot: undefined,
            snapshotHash: computeBackwardsCompatibleSnapshotHash(event.event.payload.value),
        }
    }

    return create(PersistedEventSchema, {
        event: event.event,
        hash: event.hash,
        signature: event.signature,
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

/// deprecated backfill
/// if we have a snapshot, we don't want to save it here, but we do want to indicate that we have a snapshot
/// if we don't have a snapshot hash but we do have an old snapshot (which is the deprecated case)
/// we make up a fake string in place of the hash
/// const snapshotHash =
function computeBackwardsCompatibleSnapshotHash(header: MiniblockHeader) {
    if (header.snapshotHash) {
        return header.snapshotHash
    }
    if (header.snapshot) {
        return new Uint8Array(16).fill(1)
    }
    return undefined
}

/**
 * Applies exclusion filters to miniblocks, similar to the Go backend implementation.
 * Returns new miniblocks with filtered events and partial flag set if any events were excluded.
 *
 * This function filters events based on their payload and content types, matching the behavior
 * of the Go backend's applyExclusionFilter function. Events that match any filter in the
 * exclusionFilter array are excluded from the returned miniblocks.
 *
 * @param miniblocks - Array of miniblocks to filter
 * @param exclusionFilter - Array of filters specifying which events to exclude
 * @returns Array of filtered miniblocks with partial flag set if events were excluded
 */
export function applyExclusionFilterToMiniblocks(
    miniblocks: ParsedMiniblock[],
    exclusionFilter: ExclusionFilter,
): ParsedMiniblock[] {
    return miniblocks.map((miniblock) => {
        const originalEventCount = miniblock.events.length
        const filteredEvents = miniblock.events.filter(
            (event) => !shouldExcludeEvent(event, exclusionFilter),
        )

        // If no events were filtered, return original miniblock
        if (filteredEvents.length === originalEventCount) {
            return miniblock
        }

        // Create new miniblock with filtered events and partial flag
        return {
            ...miniblock,
            events: filteredEvents,
            partial: true, // Set partial flag since events were excluded
        }
    })
}

/**
 * Determines if an event should be excluded based on exclusion filters.
 * Similar to the Go backend's shouldExcludeEvent function.
 */
export function shouldExcludeEvent(event: ParsedEvent, exclusionFilter: ExclusionFilter): boolean {
    // Extract payload type and content type
    const { payloadType, contentType } = extractEventTypeInfo(event.event)

    // Check if any filter matches this event
    for (const filter of exclusionFilter) {
        if (matchesEventFilter(payloadType, contentType, filter)) {
            return true
        }
    }

    return false
}

/**
 * Extracts payload type and content type from a StreamEvent.
 * Similar to the Go backend's extractEventTypeInfo function.
 */
export function extractEventTypeInfo(event: StreamEvent): {
    payloadType: string
    contentType: string
} {
    const payload = event.payload

    if (!payload || !payload.case) {
        return { payloadType: 'unknown', contentType: 'unknown' }
    }

    // Get payload type name (convert camelCase to snake_case for consistency with Go)
    const payloadTypeName = snakeCase(payload.case)

    // Get the payload value
    const payloadValue = payload.value
    if (!payloadValue || !payloadValue.content) {
        return { payloadType: payloadTypeName, contentType: 'none' }
    }

    // Get content type name (convert camelCase to snake_case for consistency with Go)
    const contentTypeName = snakeCase(payloadValue.content.case || 'unknown')

    return { payloadType: payloadTypeName, contentType: contentTypeName }
}

/**
 * Checks if the payload/content types match the EventFilter.
 * Similar to the Go backend's matchesEventFilter function.
 */
export function matchesEventFilter(
    payloadType: string,
    contentType: string,
    filter: { payload: PayloadCaseType | '*'; content: ContentCaseType | '*' },
): boolean {
    // Convert filter payload to snake_case for comparison
    const filterPayloadType = filter.payload === '*' ? '*' : snakeCase(filter.payload)

    // Check payload type match
    if (filterPayloadType !== '*' && filterPayloadType !== payloadType) {
        return false
    }

    // Check content type match (wildcard or exact match)
    if (filter.content === '*') {
        return true
    }

    // Convert filter content to snake_case for comparison
    const filterContentType = snakeCase(filter.content)
    return filterContentType === contentType
}
