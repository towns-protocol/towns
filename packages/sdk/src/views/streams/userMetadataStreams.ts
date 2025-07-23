import { ObservableRecord } from '../../observable/observableRecord'

export interface UserMetadataStreamModel {
    streamId: string
}

/// stream metadata gets requested from the river.delivery server - at time of writing this is only for completeness
export class UserMetadataStreamsView extends ObservableRecord<string, UserMetadataStreamModel> {
    constructor() {
        super({
            makeDefault: (userMetadataStreamId: string): UserMetadataStreamModel => ({
                streamId: userMetadataStreamId,
            }),
        })
    }
}
