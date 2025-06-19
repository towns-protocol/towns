import { ObservableRecord } from '../../observable/observableRecord'

export type StreamStatusModel = {
    streamId: string
    isInitialized: boolean
    isUpToDate: boolean
}

export class StreamStatus extends ObservableRecord<string, StreamStatusModel> {
    constructor() {
        super({
            makeDefault: (streamId: string): StreamStatusModel => ({
                streamId,
                isInitialized: false,
                isUpToDate: false,
            }),
        })
    }

    setIsUpToDate(streamId: string, isUpToDate: boolean) {
        this.set((prev) => ({
            ...prev,
            [streamId]: { ...(prev[streamId] ?? this.makeDefault(streamId)), isUpToDate },
        }))
    }

    setIsInitialized(streamId: string, isInitialized: boolean) {
        this.set((prev) => ({
            ...prev,
            [streamId]: { ...(prev[streamId] ?? this.makeDefault(streamId)), isInitialized },
        }))
    }
}
