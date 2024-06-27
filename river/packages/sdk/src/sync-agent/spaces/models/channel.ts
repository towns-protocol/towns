import { Client } from '../../../client'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'

export interface ChannelMetadata {
    name: string
}

export interface ChannelModel extends Identifiable {
    id: string
    spaceId: string
    isJoined: boolean
    metadata?: ChannelMetadata
}

@persistedObservable({ tableName: 'channel' })
export class Channel extends PersistedObservable<ChannelModel> {
    constructor(
        id: string,
        spaceId: string,
        private riverConnection: RiverConnection,
        store: Store,
    ) {
        super({ id, spaceId, isJoined: false }, store)
    }

    protected override async onLoaded() {
        this.riverConnection.registerView(this.onClientStarted)
    }

    private onClientStarted = (_client: Client) => {
        return () => {}
    }
}
