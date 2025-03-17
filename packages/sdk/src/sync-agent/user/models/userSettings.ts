import { check, dlogger } from '@river-build/dlog'
import { Identifiable, LoadPriority, Store } from '../../../store/store'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { RiverConnection } from '../../river-connection/riverConnection'
import { makeUserSettingsStreamId } from '../../../id'
import { IStreamStateView } from '../../../streamStateView'
import { Client } from '../../../client'
import { isDefined } from '../../../check'
import { UserReadMarker } from './readMarker'

const logger = dlogger('csb:userSettings')

export interface UserSettingsModel extends Identifiable {
    id: string
    streamId: string
    initialized: boolean
}

@persistedObservable({ tableName: 'userSettings' })
export class UserSettings extends PersistedObservable<UserSettingsModel> {
    readMarker: UserReadMarker

    constructor(id: string, store: Store, private riverConnection: RiverConnection) {
        super(
            { id, streamId: makeUserSettingsStreamId(id), initialized: false },
            store,
            LoadPriority.high,
        )
        this.readMarker = new UserReadMarker(riverConnection, store)
    }

    protected override onLoaded() {
        this.riverConnection.registerView(this.onClientStarted)
    }

    private onClientStarted = (client: Client) => {
        logger.log('onClientStarted')
        const streamView = client.stream(this.data.streamId)?.view
        if (streamView) {
            this.initialize(streamView)
        }
        client.on('streamInitialized', this.onStreamInitialized)
        client.on('fullyReadMarkersUpdated', (_, fullyReadMarkers) =>
            this.readMarker.onFullyReadMarkersUpdated(fullyReadMarkers),
        )
        return () => {
            client.off('streamInitialized', this.onStreamInitialized)
            client.off('fullyReadMarkersUpdated', (_, fullyReadMarkers) =>
                this.readMarker.onFullyReadMarkersUpdated(fullyReadMarkers),
            )
        }
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            check(isDefined(streamView), 'streamView is not defined')
            this.initialize(streamView)
            this.readMarker.onStreamInitialized(streamView)
        }
    }

    private initialize = (_streamView: IStreamStateView) => {
        this.setData({ initialized: true })
    }
}
