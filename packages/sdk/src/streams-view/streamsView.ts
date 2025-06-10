import { DecryptionSessionError } from '@towns-protocol/encryption'
import { DecryptedContent } from '../encryptedContentTypes'
import { StreamChange } from '../streamEvents'
import { LocalTimelineEvent, StreamTimelineEvent } from '../types'
import { TimelinesView, TimelinesViewDelegate } from './timelinesView'
import { SnapshotCaseType } from '@towns-protocol/proto'
import { TimelineEvent } from '../sync-agent/timeline/models/timeline-types'

export type StreamsViewDelegate = TimelinesViewDelegate

// a view of all the streams
export class StreamsView {
    readonly timelinesView: TimelinesView

    // todo invert this so we don't have to pass the whole client
    constructor(userId: string, delegate: StreamsViewDelegate | undefined) {
        this.timelinesView = new TimelinesView(userId, delegate)
    }

    streamInitialized(streamId: string, kind: SnapshotCaseType, events: StreamTimelineEvent[]) {
        this.timelinesView.initializeStream(streamId, kind, events)
    }

    streamUpdated(streamId: string, kind: SnapshotCaseType, change: StreamChange) {
        this.timelinesView.streamUpdated(streamId, kind, change)
    }

    streamEventDecrypted(
        streamId: string,
        kind: SnapshotCaseType,
        eventId: string,
        decryptedContent: DecryptedContent,
    ): TimelineEvent | undefined {
        return this.timelinesView.streamEventDecrypted(streamId, eventId, decryptedContent)
    }

    streamEventDecryptedContentError(
        streamId: string,
        kind: SnapshotCaseType,
        eventId: string,
        error: DecryptionSessionError,
    ) {
        this.timelinesView.streamEventDecryptedContentError(streamId, eventId, error)
    }

    streamLocalEventUpdated(
        streamId: string,
        kind: SnapshotCaseType,
        localEventId: string,
        localEvent: LocalTimelineEvent,
    ) {
        this.timelinesView.streamLocalEventUpdated(streamId, kind, localEventId, localEvent)
    }
}
