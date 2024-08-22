import { check, dlogger } from '@river-build/dlog'
import { LoadPriority, Store } from '../../../store/store'
import { UserDevice } from '@river-build/encryption'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { makeUserMetadataStreamId } from '../../../id'
import { RiverConnection } from '../../river-connection/riverConnection'
import { IStreamStateView } from '../../../streamStateView'
import { isDefined } from '../../../check'
import { Client } from '../../../client'

const logger = dlogger('csb:userMetadata')

export interface UserMetadataModel {
    id: string
    streamId: string
    initialized: boolean
    deviceId?: string
    deviceKeys: UserDevice[]
}

@persistedObservable({ tableName: 'userMetadata' })
export class UserMetadata extends PersistedObservable<UserMetadataModel> {
    constructor(id: string, store: Store, private riverConnection: RiverConnection) {
        super(
            { id, streamId: makeUserMetadataStreamId(id), initialized: false, deviceKeys: [] },
            store,
            LoadPriority.high,
        )
    }

    protected override async onLoaded() {
        this.riverConnection.registerView(this.onClientStarted)
    }

    private onClientStarted = (client: Client) => {
        logger.log('onClientStarted')
        if (this.riverConnection.client?.cryptoInitialized) {
            const deviceId = this.riverConnection.client.userDeviceKey().deviceKey
            const streamView = this.riverConnection.client.stream(this.data.streamId)?.view
            if (streamView && deviceId) {
                this.initialize(deviceId, streamView)
            } else if (deviceId) {
                this.setData({ deviceId })
            }
        }
        client.addListener('userDeviceKeysUpdated', this.onUserMetadataUpdated)
        client.addListener('streamInitialized', this.onStreamInitialized)
        return () => {
            client.removeListener('userDeviceKeysUpdated', this.onUserMetadataUpdated)
            client.removeListener('streamInitialized', this.onStreamInitialized)
        }
    }

    private onStreamInitialized = (streamId: string) => {
        if (streamId === this.data.streamId) {
            const streamView = this.riverConnection.client?.stream(this.data.streamId)?.view
            const deviceId = this.riverConnection.client?.userDeviceKey().deviceKey
            check(isDefined(deviceId), 'deviceId is not defined')
            check(isDefined(streamView), 'streamView is not defined')
            this.initialize(deviceId, streamView)
        }
    }

    private onUserMetadataUpdated = (streamId: string, deviceKeys: UserDevice[]) => {
        if (streamId === this.data.streamId) {
            logger.log('updated', streamId, deviceKeys)
            this.setData({ deviceKeys })
        }
    }

    private initialize(deviceId: string, streamView: IStreamStateView) {
        this.setData({
            initialized: true,
            deviceId,
            deviceKeys: streamView.userMetadataContent.deviceKeys,
        })
    }
}
