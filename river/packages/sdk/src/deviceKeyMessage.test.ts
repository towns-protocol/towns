/**
 * @group main
 */

import debug from 'debug'
import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { UserDevice } from '@river-build/encryption'

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
        await bobsClient.initializeUser()
        await alicesClient.initializeUser()
        // Bob gets created, starts syncing, and uploads his device keys.
        const bobsUserId = bobsClient.userId
        const bobSelfDeviceKeyDone = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, userDevice)
                bobSelfDeviceKeyDone.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        bobsClient.startSync()
        alicesClient.startSync()
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfDeviceKeyDone.expectToSucceed()
    })

    test('bobDownloadsOwnDeviceKeys', async () => {
        log('bobDownloadsOwnDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfDeviceKeyDone = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, userDevice)
                bobSelfDeviceKeyDone.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfDeviceKeyDone.expectToSucceed()
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([bobsUserId])
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesDeviceKeys', async () => {
        log('bobDownloadsAlicesDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        bobsClient.startSync()
        alicesClient.startSync()
        const alicesUserId = alicesClient.userId
        const alicesSelfDeviceKeyDone = makeDonePromise()
        alicesClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage for Alice', streamId, userId, userDevice)
                alicesSelfDeviceKeyDone.runAndDone(() => {
                    expect(streamId).toBe(aliceUserDeviceKeyStreamId)
                    expect(userId).toBe(alicesUserId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId])
        expect(deviceKeys[alicesUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnDeviceKeys', async () => {
        log('bobDownloadsAlicesAndOwnDeviceKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        bobsClient.startSync()
        alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfDeviceKeyDone = makeDonePromise()
        // bobs client should sync userDeviceKeyMessage twice (once for alice, once for bob)
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage', streamId, userId, userDevice)
                bobSelfDeviceKeyDone.runAndDone(() => {
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        // give the state sync a chance to run for both deviceKeys
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId, bobsUserId])
        expect(Object.keys(deviceKeys).length).toEqual(2)
        expect(deviceKeys[alicesUserId]).toBeDefined()
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesMultipleAndOwnDeviceKeys', async () => {
        log('bobDownloadsAlicesAndOwnDeviceKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        bobsClient.startSync()
        alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfDeviceKeyDone = makeDonePromise()

        // Alice should restart her cryptoBackend multiple times, each time uploading new device keys.
        let tenthDeviceKey = ''
        let eleventhDeviceKey = ''
        for (let i = 0; i < 20; i++) {
            await alicesClient.resetCrypto()
            if (i === 9) {
                tenthDeviceKey = alicesClient.encryptionDevice.deviceCurve25519Key!
            } else if (i === 10) {
                eleventhDeviceKey = alicesClient.encryptionDevice.deviceCurve25519Key!
            }
        }
        // bobs client should sync userDeviceKeyMessages
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage', streamId, userId, userDevice)
                bobSelfDeviceKeyDone.runAndDone(() => {
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        // give the state sync a chance to run for both deviceKeys
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId, bobsUserId])
        const aliceDevices = deviceKeys[alicesUserId]
        const aliceDeviceKeys = aliceDevices.map((device) => device.deviceKey)

        expect(aliceDevices).toBeDefined()
        expect(aliceDevices.length).toEqual(10)
        // eleventhDeviceKey out of 20 should be downloaded as part of downloadKeysForUsers
        expect(aliceDeviceKeys).toContain(eleventhDeviceKey)
        // latest key should be downloaded
        expect(aliceDeviceKeys).toContain(alicesClient.encryptionDevice.deviceCurve25519Key!)
        // any key uploaded earlier than the lookback window (i.e. 10) should not be downloaded
        expect(aliceDeviceKeys).not.toContain(tenthDeviceKey)
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })
})
