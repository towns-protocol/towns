import { check, dlogger } from '@river-build/dlog'
import { LoadPriority, Store } from '../../../store/store'
import { UserDevice } from '@river-build/encryption'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { makeUserDeviceKeyStreamId } from '../../../id'
import { RiverConnection } from '../../river-connection/riverConnection'
import { StreamStateView } from '../../../streamStateView'
import { isDefined } from '../../../check'
import { Client } from '../../../client'

const logger = dlogger('csb:userDeviceKeys')

export interface UserDeviceKeysModel {
    id: string
    streamId: string
    initialized: boolean
    deviceId?: string
    deviceKeys: UserDevice[]
}

@persistedObservable({ tableName: 'userDeviceKeys' })
export class UserDeviceKeys extends PersistedObservable<UserDeviceKeysModel> {
    constructor(id: string, store: Store, private riverConnection: RiverConnection) {
        super(
            { id, streamId: makeUserDeviceKeyStreamId(id), initialized: false, deviceKeys: [] },
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
        client.addListener('userDeviceKeysUpdated', this.onUserDeviceKeysUpdated)
        client.addListener('streamInitialized', this.onStreamInitialized)
        return () => {
            client.removeListener('userDeviceKeysUpdated', this.onUserDeviceKeysUpdated)
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

    private onUserDeviceKeysUpdated = (streamId: string, deviceKeys: UserDevice[]) => {
        if (streamId === this.data.streamId) {
            logger.log('updated', streamId, deviceKeys)
            this.setData({ deviceKeys })
        }
    }

    private initialize(deviceId: string, streamView: StreamStateView) {
        this.setData({
            initialized: true,
            deviceId,
            deviceKeys: streamView.userDeviceKeyContent.deviceKeys,
        })
    }
}
