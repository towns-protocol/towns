/**
 * @group main
 */

import { Client } from './client'
import { makeTestClient } from './util.test'
import { dlog } from './dlog'
import { SessionKeys } from '@river/proto'

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
        await bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const keys = new SessionKeys({ keys: ['hi!'] })
        // create a message to encrypt with Bob's devices over Olm
        const envelope = await alicesClient.encryptOlm(keys, [bobsClient.userDeviceKey()])
        expect(envelope[bobsClient.userDeviceKey().deviceKey]).toBeDefined()
        // ensure olm session with bob
        const clear = await bobsClient.decryptOlmEvent(
            envelope[bobsClient.userDeviceKey().deviceKey],
            alicesClient.userDeviceKey().deviceKey,
        )
        expect(clear).toBeDefined()
        log('clear', clear)
        const keys2 = SessionKeys.fromJsonString(clear)
        expect(keys2.keys[0]).toEqual('hi!')
    })

    test('clientCanEncryptDecryptToDeviceMultipleEventObjects', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        for (const message of ['oh hello', 'why how are you?']) {
            const keys = new SessionKeys({ keys: [message] })
            // create a message to encrypt with Bob's devices over Olm
            const envelope = await alicesClient.encryptOlm(keys, [bobsClient.userDeviceKey()])
            expect(envelope[bobsClient.userDeviceKey().deviceKey]).toBeDefined()
            // ensure olm session with bob
            const clear = await bobsClient.decryptOlmEvent(
                envelope[bobsClient.userDeviceKey().deviceKey],
                alicesClient.userDeviceKey().deviceKey,
            )
            expect(clear).toBeDefined()
            log('clear', clear)
            const keys2 = SessionKeys.fromJsonString(clear)
            expect(keys2.keys[0]).toEqual(message)
        }
    })
})
