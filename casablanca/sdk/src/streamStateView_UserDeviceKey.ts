import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    DeviceKeys,
    MiniblockHeader,
    Snapshot,
    UserDeviceKeyPayload,
    UserDeviceKeyPayload_Inception,
    UserDeviceKeyPayload_Snapshot,
    UserDeviceKeyPayload_UserDeviceKey,
} from '@river/proto'
import { logNever } from './check'
import { StreamStateView_IContent } from './streamStateView_IContent'

export class StreamStateView_UserDeviceKeys implements StreamStateView_IContent {
    readonly streamId: string

    // user_id -> device_keys, fallback_keys
    readonly uploadedDeviceKeys = new Map<string, UserDeviceKeyPayload_UserDeviceKey[]>()

    constructor(inception: UserDeviceKeyPayload_Inception) {
        this.streamId = inception.streamId
    }

    initialize(
        snapshot: Snapshot,
        content: UserDeviceKeyPayload_Snapshot,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        // dispatch events for all device keys, todo this seems inefficient?
        for (const [_, value] of Object.entries(content.userDeviceKeys)) {
            this.addUserDeviceKey(value, emitter)
        }
    }

    onMiniblockHeader(_blockHeader: MiniblockHeader, _emitter?: TypedEmitter<EmittedEvents>): void {
        // nothing to do
    }

    prependEvent(
        event: ParsedEvent,
        payload: UserDeviceKeyPayload,
        _emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userDeviceKey':
                // handled in snapshot
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    appendEvent(
        event: ParsedEvent,
        payload: UserDeviceKeyPayload,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userDeviceKey':
                this.addUserDeviceKey(payload.content.value, emitter)
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }

    private addUserDeviceKey(
        value: UserDeviceKeyPayload_UserDeviceKey,
        emitter: TypedEmitter<EmittedEvents> | undefined,
    ) {
        {
            const { userId, deviceKeys, fallbackKeys } = value
            emitter?.emit(
                'userDeviceKeyMessage',
                this.streamId,
                userId,
                deviceKeys as DeviceKeys,
                fallbackKeys,
            )
            if (deviceKeys?.deviceId !== undefined) {
                this.uploadedDeviceKeys.set(userId, [
                    ...(this.uploadedDeviceKeys.get(userId) || []),
                    value,
                ])
            }
        }
    }
}
