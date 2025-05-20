/**
 * @group main
 */

import { assert } from '../../check'
import { Client } from '../../client'
import { makeTestClient } from '../testUtils'
import { SessionKeysSchema } from '@towns-protocol/proto'
import { bin_fromHexString, dlog } from '@towns-protocol/dlog'
import { create, fromJsonString, toJsonString } from '@bufbuild/protobuf'

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
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        expect(
            alicesClient.userDeviceKey().deviceKey !== bobsClient.userDeviceKey().deviceKey,
        ).toBe(true)
        alicesClient.startSync()
        const keys = create(SessionKeysSchema, { keys: ['hi!'] })
        const jsonStr = toJsonString(SessionKeysSchema, keys)
        // create a message to encrypt with Bob's devices
        const envelope = await alicesClient.encryptWithDeviceKeys(jsonStr, [
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
        const keys2 = fromJsonString(SessionKeysSchema, clear)
        expect(keys2.keys[0]).toEqual('hi!')
    })

    test('clientCanEncryptDecryptInboxMultipleEventObjects', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        expect(
            alicesClient.userDeviceKey().deviceKey !== bobsClient.userDeviceKey().deviceKey,
        ).toBe(true)
        alicesClient.startSync()

        for (const message of ['oh hello', 'why how are you?']) {
            const keys = create(SessionKeysSchema, { keys: [message] })
            const jsonStr = toJsonString(SessionKeysSchema, keys)
            // create a message to encrypt with Bob's devices
            const envelope = await alicesClient.encryptWithDeviceKeys(jsonStr, [
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
            const keys2 = fromJsonString(SessionKeysSchema, clear)
            expect(keys2.keys[0]).toEqual(message)
        }
    })

    test('client can check if a hybrid session exists', async () => {
        const bob = await makeTestClient()
        if (!bob.cryptoBackend) {
            throw new Error('bob.cryptoBackend is undefined')
        }

        const streamId = '0xabcd'
        let hasSession = await bob.cryptoBackend.hasHybridSession(streamId)
        expect(hasSession).toBe(false)

        await bob.ensureOutboundSession(streamId, { awaitInitialShareSession: false })
        hasSession = await bob.cryptoBackend.hasHybridSession(streamId)
        expect(hasSession).toBe(true)
    })
})
