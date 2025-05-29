import { DecryptionSessionError } from '@towns-protocol/encryption'
import { DecryptedContent } from '../encryptedContentTypes'
import { StreamChange } from '../streamEvents'
import { LocalTimelineEvent, StreamTimelineEvent } from '../types'
import { TimelineStore, TimelineStoreDelegate } from './timelineStore'
import { SnapshotCaseType } from '@towns-protocol/proto'
import { TimelineEvent } from '../sync-agent/timeline/models/timeline-types'

export type StreamsViewDelegate = TimelineStoreDelegate

// a view of all the streams
export class StreamsView {
    readonly timelineStore: TimelineStore

    // todo invert this so we don't have to pass the whole client
    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        this.timelineStore = new TimelineStore(userId, delegate)
    }

    streamInitialized(streamId: string, kind: SnapshotCaseType, events: StreamTimelineEvent[]) {
        if (hasTimelineContent(kind)) {
            this.timelineStore.initializeStream(streamId, kind, events)
        }
    }

    streamUpdated(streamId: string, kind: SnapshotCaseType, change: StreamChange) {
        if (hasTimelineContent(kind)) {
            this.timelineStore.streamUpdated(streamId, kind, change)
        }
    }

    streamEventDecrypted(
        streamId: string,
        kind: SnapshotCaseType,
        eventId: string,
        decryptedContent: DecryptedContent,
    ): TimelineEvent | undefined {
        if (hasTimelineContent(kind)) {
            return this.timelineStore.streamEventDecrypted(streamId, eventId, decryptedContent)
        }
        return undefined
    }

    streamEventDecryptedContentError(
        streamId: string,
        kind: SnapshotCaseType,
        eventId: string,
        error: DecryptionSessionError,
    ) {
        if (hasTimelineContent(kind)) {
            this.timelineStore.streamEventDecryptedContentError(streamId, eventId, error)
        }
    }

    streamLocalEventUpdated(
        streamId: string,
        kind: SnapshotCaseType,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) {
        if (hasTimelineContent(kind)) {
            this.timelineStore.streamLocalEventUpdated(streamId, kind, localEventId, localEvent)
        }
    }
}

function hasTimelineContent(kind: SnapshotCaseType) {
    return (
        kind === 'channelContent' ||
        kind === 'spaceContent' ||
        kind === 'dmChannelContent' ||
        kind === 'gdmChannelContent'
    )
}
