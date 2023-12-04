import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    MiniblockHeader,
    Snapshot,
    UserDeviceKeyPayload,
    UserDeviceKeyPayload_Inception,
    UserDeviceKeyPayload_MegolmDevice,
    UserDeviceKeyPayload_Snapshot,
} from '@river/proto'
import { logNever } from './check'
import { StreamStateView_IContent } from './streamStateView_IContent'
import { UserDevice } from './crypto/olmLib'

export class StreamStateView_UserDeviceKeys implements StreamStateView_IContent {
    readonly streamId: string
    readonly streamCreatorId: string

    // user_id -> device_keys, fallback_keys
    readonly megolmKeys: UserDevice[] = []

    constructor(inception: UserDeviceKeyPayload_Inception) {
        this.streamId = inception.streamId
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

    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // nothing to do
    }

    prependEvent(
        _event: ParsedEvent,
        _payload: UserDeviceKeyPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // nohing to do
    }

    appendEvent(
        event: ParsedEvent,
        payload: UserDeviceKeyPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
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
