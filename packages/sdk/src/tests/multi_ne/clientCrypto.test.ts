/**
 * @group main
 */

import { assert } from '../../check'
import { Client } from '../../client'
import { makeTestClient, makeUniqueSpaceStreamId } from '../testUtils'
import { SessionKeysSchema } from '@towns-protocol/proto'
import { create, fromJsonString, toJsonString } from '@bufbuild/protobuf'
import { dlog } from '@towns-protocol/utils'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
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
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        if (!bobsClient.cryptoBackend) {
            throw new Error('bob.cryptoBackend is undefined')
        }

        const streamId = makeUniqueSpaceStreamId()
        await bobsClient.createSpace(streamId)
        let hasSession = await bobsClient.cryptoBackend.hasHybridSession(streamId)
        expect(hasSession).toBe(false)

        await bobsClient.cryptoBackend.ensureOutboundSession(
            streamId,
            GroupEncryptionAlgorithmId.HybridGroupEncryption,
        )
        hasSession = await bobsClient.cryptoBackend.hasHybridSession(streamId)
        expect(hasSession).toBe(true)
    })
})
