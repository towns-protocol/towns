import { check } from '@river-build/dlog'
import { LoadPriority, type Identifiable, type Store } from '../../../../store/store'
import {
    PersistedObservable,
    persistedObservable,
} from '../../../../observable/persistedObservable'
import type { RiverConnection } from '../../../river-connection/riverConnection'
import { isDefined } from '../../../../check'
import type { Address } from '@river-build/web3'

export interface MemberEnsAddressModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
    ensAddress?: Address
}

@persistedObservable({ tableName: 'member_ensAddress' })
export class MemberEnsAddress extends PersistedObservable<MemberEnsAddressModel> {
    constructor(
        userId: string,
        streamId: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super(
            { id: `${userId}_${streamId}`, streamId, initialized: false },
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
            client.on('streamEnsAddressUpdated', this.onStreamEnsAddressUpdated)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('streamEnsAddressUpdated', this.onStreamEnsAddressUpdated)
            }
        })
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            const metadata = streamView.getMemberMetadata()
            const ensAddress = metadata?.ensAddresses.info(this.data.id) as Address | undefined
            this.setData({ initialized: true, ensAddress })
        }
    }

    private onStreamEnsAddressUpdated = (streamId: string, userId: string) => {
        if (streamId === this.data.streamId && userId === this.data.id) {
            const stream = this.riverConnection.client?.streams.get(streamId)
            const metadata = stream?.view.getMemberMetadata()
            const ensAddress = metadata?.ensAddresses.info(userId)
            if (ensAddress) {
                this.setData({ ensAddress: ensAddress as Address })
            }
        }
    }
}
