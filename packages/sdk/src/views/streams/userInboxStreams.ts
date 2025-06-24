import { ObservableRecord } from '../../observable/observableRecord'

export interface UserInboxStreamModel {
    streamId: string
}

export class UserInboxStreamsView extends ObservableRecord<string, UserInboxStreamModel> {
    constructor() {
        super({
            makeDefault: (userInboxStreamId: string): UserInboxStreamModel => ({
                streamId: userInboxStreamId,
            }),
        })
    }
}
