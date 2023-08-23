import TypedEmitter from 'typed-emitter'
import { ParsedEvent } from './types'
import { EmittedEvents } from './client'
import {
    DeviceKeys,
    UserDeviceKeyPayload,
    UserDeviceKeyPayload_Inception,
    UserDeviceKeyPayload_UserDeviceKey,
} from '@river/proto'
import { logNever } from './check'

export class StreamStateView_UserDeviceKeys {
    readonly streamId: string

    // device_id -> device_keys, fallback_keys
    readonly uploadedDeviceKeys = new Map<string, UserDeviceKeyPayload_UserDeviceKey[]>()

    constructor(inception: UserDeviceKeyPayload_Inception) {
        this.streamId = inception.streamId
    }

    appendEvent(
        event: ParsedEvent,
        payload: UserDeviceKeyPayload,
        emitter?: TypedEmitter<EmittedEvents>,
    ): void {
        switch (payload.content.case) {
            case 'inception':
                break
            case 'userDeviceKey':
                {
                    const { userId, deviceKeys, fallbackKeys } = payload.content.value
                    emitter?.emit(
                        'userDeviceKeyMessage',
                        this.streamId,
                        userId,
                        deviceKeys as DeviceKeys,
                        fallbackKeys,
                    )
                    if (deviceKeys?.deviceId !== undefined) {
                        this.uploadedDeviceKeys.set(deviceKeys.deviceId, [
                            ...(this.uploadedDeviceKeys.get(deviceKeys.deviceId) || []),
                            payload.content.value,
                        ])
                    }
                }
                break
            case undefined:
                break
            default:
                logNever(payload.content)
        }
    }
}
