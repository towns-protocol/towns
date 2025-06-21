import { ChannelProperties } from '@towns-protocol/proto'
import { ObservableRecord } from '../../observable/observableRecord'

export interface GdmStreamModel {
    streamId: string
    lastEventCreatedAtEpochMs: bigint
    metadata?: ChannelProperties
    metadataEventId?: string
    latestMetadataEventId?: string // if latestMetadataEventId is not equal to metadataEventId, we are waiting for the metadata to decrypt
}

export class GdmStreamsView extends ObservableRecord<string, GdmStreamModel> {
    constructor() {
        super({
            makeDefault: (streamId: string): GdmStreamModel => ({
                streamId,
                lastEventCreatedAtEpochMs: 0n,
            }),
        })
    }

    setLastEventCreatedAtEpochMs(streamId: string, lastEventCreatedAtEpochMs: bigint) {
        this.set((prev) => ({
            ...prev,
            [streamId]: {
                ...(prev[streamId] ?? this.makeDefault(streamId)),
                lastEventCreatedAtEpochMs,
            },
        }))
    }

    setMetadata(streamId: string, metadata: ChannelProperties, eventId: string) {
        this.set((prev) => ({
            ...prev,
            [streamId]: {
                ...(prev[streamId] ?? this.makeDefault(streamId)),
                metadata,
                metadataEventId: eventId,
            },
        }))
    }

    setLatestMetadataEventId(streamId: string, eventId: string) {
        this.set((prev) => ({
            ...prev,
            [streamId]: {
                ...(prev[streamId] ?? this.makeDefault(streamId)),
                latestMetadataEventId: eventId,
            },
        }))
    }
}
