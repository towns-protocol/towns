import debug from 'debug'
import { Client, IDeviceKeyRequest, IDownloadKeyResponse } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { DeviceKeys } from '@river/proto'

const log = debug('test')

describe('deviceKeyMessageTest', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('bobUploadsDeviceKeys', async () => {
        log('bobUploadsDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfToDevice = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfToDevice.expectToSucceed()
    })

    test('bobDownloadsOwnDeviceKeys', async () => {
        log('bobDownloadsOwnDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfToDevice = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfToDevice.expectToSucceed()
        const deviceKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers({
            [bobsUserId]: {} as IDeviceKeyRequest,
        })
        expect(deviceKeys.device_keys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesDeviceKeys', async () => {
        log('bobDownloadsAlicesDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
        const alicesUserId = alicesClient.userId
        const alicesSelfToDevice = makeDonePromise()
        alicesClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage for Alice', streamId, userId, deviceKeys, fallbackKeys)
                alicesSelfToDevice.runAndDone(() => {
                    expect(streamId).toBe(aliceUserDeviceKeyStreamId)
                    expect(userId).toBe(alicesUserId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const deviceKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers({
            [alicesUserId]: {} as IDeviceKeyRequest,
        })
        expect(deviceKeys.device_keys[alicesUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnDeviceKeys', async () => {
        log('bobDownloadsAlicesAndOwnDeviceKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfToDevice = makeDonePromise()
        // bobs client should sync userDeviceKeyMessage twice (once for alice, once for bob)
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        // give the state sync a chance to run for both deviceKeys
        const deviceKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers({
            [alicesUserId]: {} as IDeviceKeyRequest,
            [bobsUserId]: {} as IDeviceKeyRequest,
        })
        expect(Object.keys(deviceKeys.device_keys).length).toEqual(2)
        expect(deviceKeys.device_keys[alicesUserId]).toBeDefined()
        expect(deviceKeys.device_keys[bobsUserId]).toBeDefined()
    })
})
