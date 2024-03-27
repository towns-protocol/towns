import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import {
    Snapshot,
    UserDeviceKeyPayload,
    UserDeviceKeyPayload_EncryptionDevice,
    UserDeviceKeyPayload_Snapshot,
} from '@river-build/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@river-build/dlog'
import { logNever } from './check'
import { UserDevice } from '@river-build/encryption'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'
import { getUserIdFromStreamId } from './id'

export class StreamStateView_UserDeviceKeys extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly streamCreatorId: string

    // user_id -> device_keys, fallback_keys
    readonly deviceKeys: UserDevice[] = []

    constructor(streamId: string) {
        super()
        this.streamId = streamId
        this.streamCreatorId = getUserIdFromStreamId(streamId)
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserDeviceKeyPayload_Snapshot,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // dispatch events for all device keys, todo this seems inefficient?
        for (const value of content.encryptionDevices) {
            this.addUserDeviceKey(value, encryptionEmitter)
        }
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        // nohing to do
    }

    appendEvent(
        event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
        _stateEmitter: TypedEmitter<StreamStateEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userDeviceKeyPayload')
        const payload: UserDeviceKeyPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'encryptionDevice':
                this.addUserDeviceKey(payload.content.value, encryptionEmitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserDeviceKey(
        value: UserDeviceKeyPayload_EncryptionDevice,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        const device = {
            deviceKey: value.deviceKey,
            fallbackKey: value.fallbackKey,
        } satisfies UserDevice
        const existing = this.deviceKeys.findIndex((x) => x.deviceKey === device.deviceKey)
        if (existing >= 0) {
            this.deviceKeys.splice(existing, 1)
        }
        this.deviceKeys.push(device)
        encryptionEmitter?.emit('userDeviceKeyMessage', this.streamId, this.streamCreatorId, device)
    }
}
