import { Client } from './client'
import { makeTestClient } from './util.test'
import { IContent, RiverEvent } from './event'
import { OLM_ALGORITHM } from './crypto/olmLib'
import { make_ChannelPayload_Message, make_UserPayload_ToDevice } from './types'
import { ToDeviceOp } from '@towns/proto'

describe('clientCryptoTest', () => {
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

    test('clientCanEncryptEvent', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId

        const payload = { content: 'First secret encrypted message!' }
        // create a message to encrypt with Bob's devices over Olm
        const content: IContent = { ['payload']: payload, ['algorithm']: OLM_ALGORITHM }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId,
        })
        expect(event.event.content).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(true)
        await expect(alicesClient.encryptEvent(event, [bobsUserId])).toResolve()
        expect(event.getWireContent().ciphertext).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(false)
    })

    test('clientCanEncryptDecryptEvent', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId

        const payload = { sender: alicesClient.userId, content: 'First secret encrypted message!' }
        // create a message
        const content: IContent = { ['payload']: payload, ['algorithm']: OLM_ALGORITHM }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(true)
        await expect(alicesClient.encryptEvent(event, [bobsUserId])).toResolve()
        expect(event?.event?.content?.ciphertext).toBeDefined()
        event.setClearData({ clearEvent: { content: {} } })
        expect(event.getContent().payload).toBeUndefined()
        await expect(
            bobsClient.decryptEventIfNeeded(event, { forceRedecryptIfUntrusted: true }),
        ).toResolve()
        expect(event.getPlainContent().payload).toContain('First secret encrypted message!')
    })

    test('clientCanEncryptDecryptToDeviceEvent', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId

        const payload = { sender: alicesClient.userId, content: 'First secret encrypted message!' }
        // create a message to encrypt
        const content: IContent = { ['payload']: payload, ['algorithm']: OLM_ALGORITHM }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, [bobsUserId])).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event?.event?.content?.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }

        // create a toDevice event from the encrypted event
        const ciphertext = event?.getWireContent().ciphertext
        const toDevicePayload = make_UserPayload_ToDevice({
            deviceKey: '', // ok to omit as we already encrypted the payload for bob's device
            senderKey: senderKey,
            op: ToDeviceOp.TDO_UNSPECIFIED,
            message: { ciphertext },
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: toDevicePayload,
                creator_user_id: alicesClient.userId,
            },
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContent().ciphertext).toBeDefined()
        expect(encryptedEvent.getPlainContent().payload).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        expect(encryptedEvent.getPlainContent().payload).toContain(
            'First secret encrypted message!',
        )
    })

    test('clientCanEncryptDecryptToDeviceEventObject', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId

        const payload = {
            sender: alicesClient.userId,
            content: { key: 'First secret encrypted message!' },
        }
        // create a message to encrypt
        const content: IContent = { ['payload']: payload, ['algorithm']: OLM_ALGORITHM }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, [bobsUserId])).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContent().ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        const ciphertext = event?.getWireContent().ciphertext
        // create a toDevice event from the encrypted event
        const toDevicePayload = make_UserPayload_ToDevice({
            deviceKey: '', // ok to omit as we already encrypted the payload for bob's device
            senderKey: senderKey,
            op: ToDeviceOp.TDO_UNSPECIFIED,
            message: { ciphertext },
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: toDevicePayload,
                creator_user_id: alicesClient.userId,
            },
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContent().ciphertext).toBeDefined()
        expect(encryptedEvent.getContent().payload).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        expect(encryptedEvent.getPlainContent().payload).toContain(
            'First secret encrypted message!',
        )
    })

    test('clientCanEncryptDecryptToDeviceMultipleEventObjects', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const values = ['First secret encrypted message!', 'Second secret encrypted message!']
        const payloads = [
            {
                sender: alicesClient.userId,
                content: { key: values[0] },
            },
            {
                sender: alicesClient.userId,
                content: { key: values[1] },
            },
        ]
        for (let i = 0; i < payloads.length; i++) {
            const payload = payloads[i]
            // create a message to encrypt
            const content: IContent = { ['payload']: payload, ['algorithm']: OLM_ALGORITHM }

            const event = new RiverEvent({
                content: content,
                sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            })
            // ensure olm session with bob
            expect(event.event.content).toBeDefined()
            await expect(alicesClient.encryptEvent(event, [bobsUserId])).toResolve()
            expect(event.shouldAttemptDecryption()).toBe(false)
            const ciphertext = event.getWireContent().ciphertext
            expect(ciphertext).toBeDefined()
            const senderKey = alicesClient.olmDevice.deviceCurve25519Key
            if (!senderKey) {
                throw new Error('Sender key not found')
            }
            // create a toDevice event from the encrypted event
            const toDevicePayload = make_UserPayload_ToDevice({
                deviceKey: '', // ok to omit as we already encrypted the payload for bob's device
                senderKey: senderKey,
                op: ToDeviceOp.TDO_UNSPECIFIED,
                message: { ciphertext },
            })

            const encryptedEvent = new RiverEvent({
                payload: {
                    parsed_event: toDevicePayload,
                    creator_user_id: alicesClient.userId,
                },
            })
            expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
            expect(encryptedEvent.getWireContent().ciphertext).toBeDefined()
            expect(encryptedEvent.getContent().payload).toBeUndefined()
            await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
            expect(encryptedEvent.getPlainContent().payload).toContain(values[i])
        }
    })

    test('clientCanEncryptDecryptMessageEvent', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId

        const payload = { sender: alicesClient.userId, content: 'First secret encrypted message!' }
        // create a message to encrypt
        const content: IContent = { ['payload']: payload, ['algorithm']: OLM_ALGORITHM }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, [bobsUserId])).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContent().ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }

        // create a message event from the encrypted event and decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            algorithm: OLM_ALGORITHM,
            text: event.getWireContent().ciphertext,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContent().ciphertext).toBeDefined()
        expect(encryptedEvent.getPlainContent().payload).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        expect(encryptedEvent.getPlainContent().payload).toContain(
            'First secret encrypted message!',
        )
    })
})
