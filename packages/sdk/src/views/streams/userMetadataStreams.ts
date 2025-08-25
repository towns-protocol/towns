import { ObservableRecord } from '../../observable/observableRecord'

export interface UserMetadataStreamModel {
    streamId: string
    appAddress?: string
}

/// stream metadata gets requested from the river.delivery server - at time of writing this is only for completeness
export class UserMetadataStreamsView extends ObservableRecord<string, UserMetadataStreamModel> {
    constructor() {
        super({
            makeDefault: (userMetadataStreamId: string): UserMetadataStreamModel => ({
                streamId: userMetadataStreamId,
                appAddress: undefined,
            }),
        })
    }

    setAppAddress(userMetadataStreamId: string, appAddress: string | undefined) {
        this.set((prev) => {
            const prevStream = prev[userMetadataStreamId] ?? this.makeDefault(userMetadataStreamId)
            return {
                ...prev,
                [userMetadataStreamId]: {
                    ...prevStream,
                    appAddress,
                },
            }
        })
    }
}
