import { ObservableRecord } from '../../observable/observableRecord'

export interface DmStreamModel {
    streamId: string
    firstPartyId?: string
    secondPartyId?: string
    lastEventCreatedAtEpochMs: bigint
}

export class DmStreamsView extends ObservableRecord<string, DmStreamModel> {
    constructor() {
        super({
            makeDefault: (streamId: string): DmStreamModel => ({
                streamId,
                firstPartyId: undefined,
                secondPartyId: undefined,
                lastEventCreatedAtEpochMs: 0n,
            }),
        })
    }

    setParticipants(streamId: string, firstPartyId: string, secondPartyId: string) {
        this.set((prev) => ({
            ...prev,
            [streamId]: {
                ...(prev[streamId] ?? this.makeDefault(streamId)),
                firstPartyId,
                secondPartyId,
            },
        }))
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
