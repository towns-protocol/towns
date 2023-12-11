import TypedEmitter from 'typed-emitter'
import { RemoteTimelineEvent } from './types'
import { EmittedEvents } from './client'
import {
    Snapshot,
    UserDeviceKeyPayload,
    UserDeviceKeyPayload_Inception,
    UserDeviceKeyPayload_MegolmDevice,
    UserDeviceKeyPayload_Snapshot,
} from '@river/proto'
import { check, logNever } from './check'
import { StreamStateView_AbstractContent } from './streamStateView_AbstractContent'
import { UserDevice } from './crypto/olmLib'
import { StreamStateView_UserStreamMembership } from './streamStateView_Membership'

export class StreamStateView_UserDeviceKeys extends StreamStateView_AbstractContent {
    readonly streamId: string
    readonly memberships: StreamStateView_UserStreamMembership
    readonly streamCreatorId: string

    // user_id -> device_keys, fallback_keys
    readonly megolmKeys: UserDevice[] = []

    constructor(inception: UserDeviceKeyPayload_Inception) {
        super()
        this.streamId = inception.streamId
        this.memberships = new StreamStateView_UserStreamMembership(inception.streamId)
        this.streamCreatorId = inception.userId
    }

    initialize(
        snapshot: Snapshot,
        content: UserDeviceKeyPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // dispatch events for all device keys, todo this seems inefficient?
        for (const value of content.megolmDevices) {
            this.addUserDeviceKey(value, emitter)
        }
    }

    prependEvent(
        _event: RemoteTimelineEvent,
        _cleartext: string | undefined,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // nohing to do
    }

    appendEvent(
        event: RemoteTimelineEvent,
        cleartext: string | undefined,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        check(event.remoteEvent.event.payload.case === 'userDeviceKeyPayload')
        const payload: UserDeviceKeyPayload = event.remoteEvent.event.payload.value
        switch (payload.content.case) {
            case 'inception':
                break
            case 'megolmDevice':
                this.addUserDeviceKey(payload.content.value, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserDeviceKey(
        value: UserDeviceKeyPayload_MegolmDevice,
        emitter: TypedEmitter<EmittedEvents> | undefined,
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
        emitter?.emit('userDeviceKeyMessage', this.streamId, this.streamCreatorId, device)
    }
}
