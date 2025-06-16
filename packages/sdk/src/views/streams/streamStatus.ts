import { Observable } from '../../observable/observable'

export type StreamStatusModel = {
    isInitialized: boolean
    isUpToDate: boolean
}

const defaultStreamStatus: StreamStatusModel = {
    isInitialized: false,
    isUpToDate: false,
}

export class StreamStatus extends Observable<Record<string, StreamStatusModel>> {
    constructor() {
        super({})
    }

    setIsUpToDate(streamId: string, isUpToDate: boolean) {
        this.set((prev) => ({
            ...prev,
            [streamId]: { ...(prev[streamId] ?? defaultStreamStatus), isUpToDate },
        }))
    }

    setIsInitialized(streamId: string, isInitialized: boolean) {
        this.set((prev) => ({
            ...prev,
            [streamId]: { ...(prev[streamId] ?? defaultStreamStatus), isInitialized },
        }))
    }
}
