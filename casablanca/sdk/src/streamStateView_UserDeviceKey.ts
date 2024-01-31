import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import {
    Snapshot,
    UserDeviceKeyPayload,
    UserDeviceKeyPayload_MegolmDevice,
    UserDeviceKeyPayload_Snapshot,
} from '@river/proto'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { check } from '@river/dlog'
import { logNever } from './check'
import { UserDevice } from '@river/waterproof'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'
import { StreamEncryptionEvents, StreamStateEvents } from './streamEvents'

export class StreamStateView_UserDeviceKeys extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    readonly streamCreatorId: string

    // user_id -> device_keys, fallback_keys
    readonly megolmKeys: UserDevice[] = []

    constructor(userId: string, streamId: string) {
        super()
        this.streamId = streamId
        this.memberships = new StreamStateView_UserStreamMembership(streamId)
        this.streamCreatorId = userId
    }

    applySnapshot(
        snapshot: Snapshot,
        content: UserDeviceKeyPayload_Snapshot,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ): void {
        // dispatch events for all device keys, todo this seems inefficient?
        for (const value of content.megolmDevices) {
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
            case 'megolmDevice':
                this.addUserDeviceKey(payload.content.value, encryptionEmitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserDeviceKey(
        value: UserDeviceKeyPayload_MegolmDevice,
        encryptionEmitter: TypedEmitter<StreamEncryptionEvents> | undefined,
    ) {
        const device = {
            deviceKey: value.deviceKey,
            fallbackKey: value.fallbackKey,
        } satisfies UserDevice
        const existing = this.megolmKeys.findIndex((x) => x.deviceKey === device.deviceKey)
        if (existing >= 0) {
            this.megolmKeys.splice(existing, 1)
        }
        this.megolmKeys.push(device)
        encryptionEmitter?.emit('userDeviceKeyMessage', this.streamId, this.streamCreatorId, device)
    }
}
