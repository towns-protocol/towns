import { check, dlogger } from '@river-build/dlog'
import { Identifiable, LoadPriority, Store } from '../../../store/store'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { RiverConnection } from '../../river-connection/riverConnection'
import { makeUserSettingsStreamId } from '../../../id'
import { StreamStateView } from '../../../streamStateView'
import { Client } from '../../../client'
import { isDefined } from '../../../check'

const logger = dlogger('csb:userSettings')

export interface UserSettingsModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
}

@persistedObservable({ tableName: 'userSettings' })
export class UserSettings extends PersistedObservable<UserSettingsModel> {
    constructor(id: string, store: Store, private riverConnection: RiverConnection) {
        super(
            { id, streamId: makeUserSettingsStreamId(id), initialized: false },
            store,
            LoadPriority.high,
        )
    }

    protected override async onLoaded() {
        this.riverConnection.registerView(this.onClientStarted)
    }

    private onClientStarted = (client: Client) => {
        logger.log('onClientStarted')
        const streamView = client.stream(this.data.streamId)?.view
        if (streamView) {
            this.initialize(streamView)
        }
        client.addListener('streamInitialized', this.onStreamInitialized)
        return () => {
            client.removeListener('streamInitialized', this.onStreamInitialized)
        }
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            this.initialize(streamView)
        }
    }

    private initialize = (_streamView: StreamStateView) => {
        this.setData({ initialized: true })
    }
}
