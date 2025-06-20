import { ObservableRecord } from '../../observable/observableRecord'

export interface GdmStreamModel {
    streamId: string
    lastEventCreatedAtEpochMs: bigint
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
}
