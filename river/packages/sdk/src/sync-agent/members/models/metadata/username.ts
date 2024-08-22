import { check } from '@river-build/dlog'
import { LoadPriority, type Identifiable, type Store } from '../../../../store/store'
import {
    PersistedObservable,
    persistedObservable,
} from '../../../../observable/persistedObservable'
import type { RiverConnection } from '../../../river-connection/riverConnection'
import { isDefined } from '../../../../check'

export interface MemberUsernameModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
    username: string
    isUsernameConfirmed: boolean
    isUsernameEncrypted: boolean
}

@persistedObservable({ tableName: 'member_username' })
export class MemberUsername extends PersistedObservable<MemberUsernameModel> {
    constructor(
        userId: string,
        streamId: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super(
            {
                id: `${userId}_${streamId}`,
                streamId,
                initialized: false,
                username: '',
                isUsernameConfirmed: false,
                isUsernameEncrypted: false,
            },
            store,
            LoadPriority.high,
        )
    }

    protected override async onLoaded() {
        this.riverConnection.registerView((client) => {
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            client.on('streamUsernameUpdated', this.onStreamUsernameUpdated)
            client.on('streamPendingUsernameUpdated', this.onStreamUsernameUpdated)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('streamUsernameUpdated', this.onStreamUsernameUpdated)
                client.off('streamPendingUsernameUpdated', this.onStreamUsernameUpdated)
            }
        })
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const metadata = streamView.getMemberMetadata()
            const info = metadata?.usernames.info(this.data.id)
            this.setData({
                initialized: true,
                username: info?.username,
                isUsernameConfirmed: info?.usernameConfirmed,
                isUsernameEncrypted: info?.usernameEncrypted,
            })
        }
    }

    private onStreamUsernameUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.data.id) {
            const stream = this.riverConnection.client?.streams.get(streamId)
            const metadata = stream?.view.getMemberMetadata()
            if (metadata) {
                const { username, usernameConfirmed, usernameEncrypted } =
                    metadata.usernames.info(userId)
                this.setData({
                    username,
                    isUsernameConfirmed: usernameConfirmed,
                    isUsernameEncrypted: usernameEncrypted,
                })
            }
        }
    }
}
