import { ObservableRecord } from '../../observable/observableRecord'

export interface UserInboxStreamModel {
    streamId: string
    appAddress?: string
}

export class UserInboxStreamsView extends ObservableRecord<string, UserInboxStreamModel> {
    constructor() {
        super({
            makeDefault: (userInboxStreamId: string): UserInboxStreamModel => ({
                streamId: userInboxStreamId,
                appAddress: undefined,
            }),
        })
    }

    setAppAddress(userInboxStreamId: string, appAddress: string | undefined) {
        this.set((prev) => {
            const prevStream = prev[userInboxStreamId] ?? this.makeDefault(userInboxStreamId)
            return {
                ...prev,
                [userInboxStreamId]: {
                    ...prevStream,
                    appAddress,
                },
            }
        })
    }
}
