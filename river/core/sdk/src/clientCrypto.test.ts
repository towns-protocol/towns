/**
 * @group main
 */

import { assert } from './check'
import { Client } from './client'
import { makeTestClient } from './util.test'
import { SessionKeys } from '@river-build/proto'
import { dlog } from '@river-build/dlog'

const log = dlog('test:clientCrypto')

describe('clientCrypto', () => {
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

    test('clientCanEncryptDecryptEvent', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.encryptionDevice.deviceCurve25519Key !==
                bobsClient.encryptionDevice.deviceCurve25519Key,
        ).toBe(true)
        alicesClient.startSync()
        const keys = new SessionKeys({ keys: ['hi!'] })
        // create a message to encrypt with Bob's devices
        const envelope = await alicesClient.encryptWithDeviceKeys(keys, [
            bobsClient.userDeviceKey(),
        ])
        expect(envelope[bobsClient.userDeviceKey().deviceKey]).toBeDefined()
        // ensure decrypting with bob's device key works
        const clear = await bobsClient.cryptoBackend?.decryptWithDeviceKey(
            envelope[bobsClient.userDeviceKey().deviceKey],
            alicesClient.userDeviceKey().deviceKey,
        )
        log('clear', clear)
        assert(clear !== undefined, 'clear should not be undefined')
        const keys2 = SessionKeys.fromJsonString(clear)
        expect(keys2.keys[0]).toEqual('hi!')
    })

    test('clientCanEncryptDecryptInboxMultipleEventObjects', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.encryptionDevice.deviceCurve25519Key !==
                bobsClient.encryptionDevice.deviceCurve25519Key,
        ).toBe(true)
        alicesClient.startSync()

        for (const message of ['oh hello', 'why how are you?']) {
            const keys = new SessionKeys({ keys: [message] })
            // create a message to encrypt with Bob's devices
            const envelope = await alicesClient.encryptWithDeviceKeys(keys, [
                bobsClient.userDeviceKey(),
            ])
            expect(envelope[bobsClient.userDeviceKey().deviceKey]).toBeDefined()
            // ensure decrypting with bob device key works
            const clear = await bobsClient.cryptoBackend?.decryptWithDeviceKey(
                envelope[bobsClient.userDeviceKey().deviceKey],
                alicesClient.userDeviceKey().deviceKey,
            )
            assert(clear !== undefined, 'clear should not be undefined')
            log('clear', clear)
            const keys2 = SessionKeys.fromJsonString(clear)
            expect(keys2.keys[0]).toEqual(message)
        }
    })
})
