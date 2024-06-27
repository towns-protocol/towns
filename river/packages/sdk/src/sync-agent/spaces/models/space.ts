import { Client } from '../../../client'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'

export interface SpaceMetadata {
    name: string
}

export interface SpaceModel extends Identifiable {
    id: string
    channelIds: string[]
    metadata?: SpaceMetadata
}

@persistedObservable({ tableName: 'space' })
export class Space extends PersistedObservable<SpaceModel> {
    constructor(id: string, private riverConnection: RiverConnection, store: Store) {
        super({ id, channelIds: [] }, store)
    }

    protected override async onLoaded() {
        this.riverConnection.registerView(this.onClientStarted)
    }

    private onClientStarted = (_client: Client) => {
        return () => {}
    }
}
