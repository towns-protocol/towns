// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument*/ import { dlog } from '../dlog'
import { CryptoEventHandlerMap } from './crypto'
import TypedEmitter from 'typed-emitter'
import EventEmitter from 'events'
import { DeviceKeys } from '@towns/proto'
import { IDownloadKeyRequest, IDownloadKeyResponse } from '../client'
import { OLM_ALGORITHM, MEGOLM_ALGORITHM } from './olmLib'
import { IDevice, DeviceInfo } from './deviceInfo'
import { OlmDevice } from './olmDevice'
import { CryptoStore } from './store/base'
import { IndexedDBCryptoStore } from './store/indexeddb-crypto-store'
import { IDeviceKeys } from '../types'

const log = dlog('csb:deviceList')

// constants for DeviceList.deviceTrackingStatus
// todo jterzis 06/14/23: forward declaring tracking status
// but we need to implement device tracking state machine itself
export enum TrackingStatus {
    NotTracked,
    PendingDownload,
    DownloadInProgress,
    UpToDate,
}

interface IDeviceDownload {
    downloadKeysForUsers(
        request: IDownloadKeyRequest,
        returnFallbackKeys?: boolean,
    ): Promise<IDownloadKeyResponse>
}

export interface IOlmDevice<T = DeviceInfo> {
    userId: string
    deviceInfo: T
}

// user-id -> device-id -> DeviceInfo
export type DeviceInfoMap = Map<string, Map<string, DeviceInfo>>

export class DeviceList extends (EventEmitter as new () => TypedEmitter<CryptoEventHandlerMap>) {
    private devices: { [userId: string]: { [deviceId: string]: IDevice } } = {}

    // map of identity keys to the user who owns it
    private userByIdentityKey: Record<string, string> = {}

    // which users we are tracking device status for
    // todo: load this from storage on load()
    private deviceTrackingStatus: { [userId: string]: TrackingStatus } = {}

    // Set whenever changes are made other than setting the sync token
    private dirty = false

    // Promise resolved when device data is saved
    private savePromise: Promise<boolean> | null = null
    // Function that resolves the save promise
    private resolveSavePromise: ((saved: boolean) => void) | null = null
    // The time the save is scheduled for
    private savePromiseTime: number | null = null
    // The timer used to delay the save
    private saveTimer: ReturnType<typeof setTimeout> | null = null

    // The 'next_batch' sync token at the point the data was written,
    // ie. a token representing the point immediately after the
    // moment represented by the snapshot in the db.
    private syncToken: string | null = null

    private hasFetched: boolean | null = null

    public constructor(
        private baseApis: IDeviceDownload,
        private readonly cryptoStore: CryptoStore,
        private olmDevice: OlmDevice,
        // max number of user IDs per request
        public readonly maxConcurrentKeyRequests = 250,
    ) {
        super()
    }

    /** Ensures up to date keys for a list of users are stored in memory,
     *  downloading and storing them if they're not or if forceDownload is true.
     */
    public async downloadKeys(userIds: string[], _forceDownload?: boolean): Promise<DeviceInfoMap> {
        const usersToDownload: IDownloadKeyRequest = {}

        userIds.forEach((u) => {
            const trackingStatus = this.deviceTrackingStatus[u]
            if (
                _forceDownload ||
                trackingStatus === undefined ||
                trackingStatus != TrackingStatus.UpToDate
            ) {
                // note as of 06/14/23: while we have a 1-1 user to device mapping,
                // we don't need to specificy deviceIds here
                // since the the server will return the singleton deviceId
                // for each user
                usersToDownload[u] = {}
            }
        })
        let failures: { [userId: string]: object } = {}
        let device_keys: Record<string, DeviceKeys[]> = {}

        if (Object.keys(usersToDownload).length != 0) {
            log('downloadKeys for users: ', usersToDownload)
            const result: IDownloadKeyResponse = await this.baseApis.downloadKeysForUsers(
                usersToDownload,
            )
            if (result.failures && Object.keys(result.failures).length != 0) {
                failures = result.failures
            }
            device_keys = result.device_keys
        }
        if (failures != undefined) {
            // todo: update tracking status for failed downloades so we keep retrying
            Object.keys(failures).forEach((userId) => {
                log('downloadKeys failures: ', failures[userId] as Error)
            })
        }

        // set devices for each user for each of their device's
        // todo: we should set devices in local storage here
        Object.keys(device_keys).forEach((userId) => {
            const devices: Record<string, IDevice> = {}
            device_keys[userId].forEach((deviceKey) => {
                if (deviceKey) {
                    // note jterzis 06/14/23: protocol device keys are stored
                    // in a more compact form, ommitting a few unimplemented fields
                    // such as verified, known, and unsigned.
                    // That said, we don't want to break the Olm interface
                    // since bad things could happen
                    // so we'll convert to the original IDevice type here.

                    // todo jterzis: typescript doesn't infer the fields of deviceKey as
                    // IDeviceKeys members, so we have to cast here. Fix this by
                    // normalizing IDeviceKeys to protocol DeviceKey type.
                    const deviceId = deviceKey.deviceId as unknown as string
                    const { algorithms, keys, signatures } = deviceKey as unknown as IDeviceKeys
                    const deviceInfo: IDevice = {
                        algorithms: algorithms,
                        keys: keys,
                        signatures: { [deviceId]: signatures ?? {} },
                    }
                    devices[deviceId] = deviceInfo
                }
            })
            this.setRawStoredDevicesForUser(userId, devices)
        })
        return this.getDevicesFromStore(userIds)
    }

    /**
     * Set the stored device data for a user in raw object form.
     * Called by downloadKeys.
     */
    public setRawStoredDevicesForUser(userId: string, devices: Record<string, IDevice>): void {
        // remove old devices from userByIdentityKey
        if (this.devices[userId] !== undefined) {
            for (const [deviceId, device] of Object.entries(this.devices[userId])) {
                const identityKey = device.keys['curve25519:' + deviceId]
                delete this.userByIdentityKey[identityKey]
            }
        }

        this.devices[userId] = devices

        // add new devices into userByIdentityKey
        for (const [deviceId, device] of Object.entries(devices)) {
            const identityKey = device.keys['curve25519:' + deviceId]
            this.userByIdentityKey[identityKey] = userId
        }
    }

    /**
     * Get the stores device keys as DeviceInfo objects for a list of user ids.
     */
    private getDevicesFromStore(userIds: string[]): DeviceInfoMap {
        const stored: DeviceInfoMap = new Map()
        userIds.forEach((userId) => {
            const deviceMap: Map<string, DeviceInfo> = new Map()
            this.getStoredDevicesForUser(userId)?.forEach(function (device) {
                deviceMap.set(device.deviceId, device)
            })
            stored.set(userId, deviceMap)
        })
        return stored
    }

    /**
     * Get the stored device keys for a user id.
     */
    public getStoredDevicesForUser(userId: string): DeviceInfo[] | undefined {
        const devices = this.devices[userId]
        if (!devices) {
            return undefined
        }
        const result: DeviceInfo[] = []
        for (const deviceId in devices) {
            result.push(DeviceInfo.fromStorage(devices[deviceId], deviceId))
        }
        return result
    }

    /**
     * Get the stored keys for a single device
     *
     *
     * @returns device, or undefined
     * if we don't know about this device
     */
    public getStoredDevice(userId: string, deviceId: string): DeviceInfo | undefined {
        const devs = this.devices[userId]
        if (!devs?.[deviceId]) {
            return undefined
        }
        return DeviceInfo.fromStorage(devs[deviceId], deviceId)
    }

    /**
     * Get a user ID by one of their device's curve25519 identity key.
     */
    public getUserByIdentityKey(algorithm: string, senderKey: string): string | undefined {
        if (algorithm !== OLM_ALGORITHM && algorithm !== MEGOLM_ALGORITHM) {
            log('getUserByIdentityKey: unsupported key algorithm', algorithm)
            return undefined
        }
        return this.userByIdentityKey[senderKey]
    }

    /**
     *  Find a device by curve25519 identity key.
     */
    public getDeviceByIdentityKey(algorithm: string, senderKey: string): DeviceInfo | undefined {
        const userId = this.getUserByIdentityKey(algorithm, senderKey)
        if (!userId) {
            return undefined
        }

        const devices = this.devices[userId]
        if (!devices) {
            return undefined
        }

        for (const deviceId in devices) {
            const device = devices[deviceId]
            for (const keyId in device.keys) {
                if (keyId.indexOf('curve25519:') !== 0) {
                    continue
                }
                const deviceKey = device.keys[keyId]
                if (deviceKey === senderKey) {
                    return DeviceInfo.fromStorage(device, deviceId)
                }
            }
        }

        return undefined
    }

    /**
     * Get the stored device data for a user, in raw object form
     *
     * @param userId - the user to get data for
     *
     * @returns `deviceId->{object}` devices, or undefined if
     * there is no data for this user.
     */
    public getRawStoredDevicesForUser(userId: string): Record<string, IDevice> {
        return this.devices[userId]
    }

    /**
     * Replaces the list of devices for a user with the given device list
     *
     * @param userId - The user ID
     * @param devices - New device info for user
     */
    public storeDevicesForUser(userId: string, devices: Record<string, IDevice>): void {
        this.setRawStoredDevicesForUser(userId, devices)
        this.dirty = true
    }

    public stop(): void {
        if (this.saveTimer !== null) {
            clearTimeout(this.saveTimer)
        }
    }
    /**
     * Save the device tracking state to storage, if any changes are
     * pending other than updating the sync token
     *
     * The actual save will be delayed by a short amount of time to
     * aggregate multiple writes to the database.
     *
     * @param delay - Time in ms before which the save actually happens.
     *     By default, the save is delayed for a short period in order to batch
     *     multiple writes, but this behaviour can be disabled by passing 0.
     *
     * @returns true if the data was saved, false if
     *     it was not (eg. because no changes were pending). The promise
     *     will only resolve once the data is saved, so may take some time
     *     to resolve.
     */
    public async saveIfDirty(delay = 500): Promise<boolean> {
        if (!this.dirty) return false
        // Delay saves for a bit so we can aggregate multiple saves that happen
        // in quick succession (eg. when a whole room's devices are marked as known)

        const targetTime = Date.now() + delay
        if (this.savePromiseTime && targetTime < this.savePromiseTime) {
            // There's a save scheduled but for after we would like: cancel
            // it & schedule one for the time we want
            if (this.saveTimer !== null) {
                clearTimeout(this.saveTimer)
            }
            this.saveTimer = null
            this.savePromiseTime = null
            // (but keep the save promise since whatever called save before
            // will still want to know when the save is done)
        }

        let savePromise = this.savePromise
        if (savePromise === null) {
            savePromise = new Promise((resolve) => {
                this.resolveSavePromise = resolve
            })
            this.savePromise = savePromise
        }

        if (this.saveTimer === null) {
            const resolveSavePromise = this.resolveSavePromise
            this.savePromiseTime = targetTime
            this.saveTimer = setTimeout(async () => {
                log('Saving device tracking data', this.syncToken)

                // null out savePromise now (after the delay but before the write),
                // otherwise we could return the existing promise when the save has
                // actually already happened.
                this.savePromiseTime = null
                this.saveTimer = null
                this.savePromise = null
                this.resolveSavePromise = null
                try {
                    // jterzis 06/14/23: converted from .then() to await to avoid orphaned callbacks
                    await this.cryptoStore.doTxn(
                        'readwrite',
                        [IndexedDBCryptoStore.STORE_DEVICE_DATA],
                        (txn) => {
                            this.cryptoStore.storeEndToEndDeviceData(
                                {
                                    devices: this.devices,
                                    trackingStatus: this.deviceTrackingStatus,
                                    syncToken: this.syncToken ?? undefined,
                                },
                                txn,
                            )
                        },
                    )
                    this.dirty = false
                    resolveSavePromise?.(true)
                } catch (e) {
                    log('Failed to save device tracking data', this.syncToken)
                    log(e)
                }
            }, delay)
        }

        return savePromise
    }

    /**
     * Load the device tracking state from storage
     */
    public async load(): Promise<void> {
        await this.cryptoStore.doTxn(
            'readonly',
            [IndexedDBCryptoStore.STORE_DEVICE_DATA],
            (txn) => {
                this.cryptoStore.getEndToEndDeviceData(txn, (deviceData) => {
                    this.hasFetched = Boolean(deviceData && deviceData.devices)
                    this.devices = deviceData ? deviceData.devices : {}
                    //this.crossSigningInfo = deviceData ? deviceData.crossSigningInfo || {} : {};
                    this.deviceTrackingStatus = deviceData ? deviceData.trackingStatus : {}
                    this.syncToken = deviceData?.syncToken ?? null
                    this.userByIdentityKey = {}
                    for (const user of Object.keys(this.devices)) {
                        const userDevices = this.devices[user]
                        for (const device of Object.keys(userDevices)) {
                            const idKey = userDevices[device].keys['curve25519:' + device]
                            if (idKey !== undefined) {
                                this.userByIdentityKey[idKey] = user
                            }
                        }
                    }
                })
            },
        )
    }
}
