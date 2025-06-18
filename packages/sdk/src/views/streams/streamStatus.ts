import { Observable } from '../../observable/observable'

export type StreamStatusModel = {
    isInitialized: boolean
    isUpToDate: boolean
}

const defaultStreamStatus: StreamStatusModel = {
    isInitialized: false,
    isUpToDate: false,
}

// entries in the map should never be undefined, but Records don't differentiate between
// undefined and missing keys, so we need to use a Record with undefined values
export class StreamStatus extends Observable<Record<string, StreamStatusModel | undefined>> {
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
