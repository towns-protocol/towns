import { UserDeviceKeyPayload_UserDeviceKey } from '@river/proto'
import { UserDevice } from './crypto/olmLib'

export function deviceKeyPayloadToUserDevice(
    payload: UserDeviceKeyPayload_UserDeviceKey,
): UserDevice | undefined {
    const deviceKeys = payload.deviceKeys
    if (!deviceKeys) {
        return undefined
    }
    const fallbackKey = Object.values(payload.fallbackKeys?.algoKeyId ?? {})[0].key
    const deviceKey = payload.deviceKeys?.keys?.[`curve25519:${deviceKeys.deviceId}`]

    if (!fallbackKey || !deviceKey) {
        return undefined
    }
    return {
        deviceId: deviceKeys.deviceId,
        fallbackKey,
        deviceKey,
    }
}
