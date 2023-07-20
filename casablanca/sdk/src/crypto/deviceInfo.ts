import { DeviceInfoMap } from './deviceList'

export interface ISignatures {
    [entity: string]: {
        [keyId: string]: string
    }
}
export interface IDevice {
    keys: Record<string, string>
    algorithms: string[]
    verified?: DeviceVerification
    known?: boolean
    unsigned?: Record<string, any>
    signatures?: ISignatures
}

enum DeviceVerification {
    Blocked = -1,
    Unverified = 0,
    Verified = 1,
}

export type ToDevicePayload = Record<string, any>

export interface ToDeviceMessage {
    userId: string
    deviceId: string
    payload: ToDevicePayload
}

export interface Curve25519Key {
    deviceId: string // deviceId of the device that owns this key
    key: string // base64 string
}

export interface ToDeviceBatch {
    eventType?: string
    batch: ToDeviceMessage[]
}

export class DeviceInfo {
    public static fromStorage(obj: Partial<IDevice>, deviceId: string): DeviceInfo {
        const res = new DeviceInfo(deviceId)
        for (const prop in obj) {
            // eslint-disable-next-line
            if (obj.hasOwnProperty(prop)) {
                // @ts-ignore
                res[prop as keyof IDevice] = obj[prop as keyof IDevice]
            }
        }
        return res
    }

    public static DeviceVerification = {
        VERIFIED: DeviceVerification.Verified,
        UNVERIFIED: DeviceVerification.Unverified,
        BLOCKED: DeviceVerification.Blocked,
    }

    /** list of algorithms supported by this device */
    public algorithms: string[] = []
    /** a map from `<key type>:<id> -> <base64-encoded key>` */
    public keys: Record<string, string> = {}
    /** whether the device has been verified/blocked by the user */
    public verified = DeviceVerification.Unverified
    /**
     * whether the user knows of this device's existence
     * (useful when warning the user that a user has added new devices)
     */
    public known = false
    public unsigned: Record<string, string> = {}
    public signatures: ISignatures = {}

    public constructor(public readonly deviceId: string) {}

    /**
     * Get a Curve25519 key for a user. Optionally,
     * pass in a device id to get the key for a specific device.
     *
     * @param userId
     * @param device
     * @param targetDeviceId
     * @returns
     */
    public static getCurve25519KeyFromUserId(
        userId: string,
        device: DeviceInfoMap,
        returnFirstMatch = true,
        targetDeviceId?: string,
    ): Curve25519Key[] | undefined {
        const deviceInfoMap = device

        const curve25519deviceKey: Curve25519Key[] = []
        const devices = deviceInfoMap.get(userId)
        if (!devices) {
            return curve25519deviceKey
        }
        let match = false
        for (const deviceId of devices.keys()) {
            if (match) {
                break
            }
            const deviceInfo = devices.get(deviceId)
            if (!deviceInfo) {
                continue
            }
            for (const keyId of Object.keys(deviceInfo.keys)) {
                // find first key with keyId: curve25519:<deviceId>
                // and return base64 encoded key
                if (keyId.startsWith('curve25519') && keyId.endsWith(deviceId)) {
                    if (targetDeviceId) {
                        if (!keyId.endsWith(targetDeviceId)) {
                            continue
                        }
                    }
                    curve25519deviceKey.push({ deviceId: deviceId, key: deviceInfo.keys[keyId] })
                    if (returnFirstMatch) {
                        match = true
                        break
                    }
                }
            }
        }
        return curve25519deviceKey
    }

    public toStorage(): IDevice {
        return {
            algorithms: this.algorithms,
            keys: this.keys,
            verified: this.verified,
            known: this.known,
            unsigned: this.unsigned,
            signatures: this.signatures,
        }
    }

    /**
     * Get the fingerprint for this device (i.e. Ed25519 key)
     *
     * returns base64-encoded fingerprint of this device
     */
    public getFingerprint(): string {
        return this.keys['donotuse:' + this.deviceId]
    }

    /**
     * Get the identity key for this device (i.e. Curve25519 key)
     *
     * returns base64-encoded identity key of this device
     */
    public getIdentityKey(): string {
        return this.keys['curve25519:' + this.deviceId]
    }

    public getDisplayName(): string | undefined {
        return this.unsigned.device_display_name || undefined
    }

    public isBlocked(): boolean {
        return this.verified == DeviceVerification.Blocked
    }

    public isVerified(): boolean {
        return this.verified == DeviceVerification.Verified
    }

    public isUnverified(): boolean {
        return this.verified == DeviceVerification.Unverified
    }

    public isKnown(): boolean {
        return this.known === true
    }
}
