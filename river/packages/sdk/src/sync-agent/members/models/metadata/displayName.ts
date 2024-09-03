import { check } from '@river-build/dlog'
import { LoadPriority, type Identifiable, type Store } from '../../../../store/store'
import {
    PersistedObservable,
    persistedObservable,
} from '../../../../observable/persistedObservable'
import type { RiverConnection } from '../../../river-connection/riverConnection'
import { isDefined } from '../../../../check'

export interface MemberDisplayNameModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
    displayName?: string
    isEncrypted?: boolean
}

// This model doenst listen to events here.
// They are listened in the members model, which propagates the updates to this model.
@persistedObservable({ tableName: 'member_displayName' })
export class MemberDisplayName extends PersistedObservable<MemberDisplayNameModel> {
    constructor(
        private userId: string,
        streamId: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super(
            {
                id: `${userId}_${streamId}`,
                streamId,
                initialized: false,
                displayName: undefined,
                isEncrypted: false,
            },
            store,
            LoadPriority.high,
        )
    }

    public onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const metadata = streamView.getMemberMetadata()
            const info = metadata?.displayNames.info(this.userId)
            this.setData({
                initialized: true,
                displayName: info?.displayName,
                isEncrypted: info?.displayNameEncrypted,
            })
        }
    }

    public onStreamDisplayNameUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.userId) {
            const stream = this.riverConnection.client?.streams.get(streamId)
            const metadata = stream?.view.getMemberMetadata()
            const info = metadata?.displayNames.info(userId)
            if (info) {
                this.setData({
                    displayName: info.displayName,
                    isEncrypted: info.displayNameEncrypted,
                })
            }
        }
    }
}
