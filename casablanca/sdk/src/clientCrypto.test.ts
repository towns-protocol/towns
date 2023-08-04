import { Client } from './client'
import { makeTestClient } from './util.test'
import { IContent, RiverEvent } from './event'
import { OLM_ALGORITHM } from './crypto/olmLib'
import {
    make_ChannelPayload_Message,
    make_UserPayload_ToDevice,
    make_ToDevice_KeyRequest,
} from './types'
import { ToDeviceOp } from '@river/proto'

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

        // create a message to encrypt with Bob's devices over Olm
        const envelope = await alicesClient.createOlmEncryptedCipherFromEvent(
            make_ToDevice_KeyRequest({
                spaceId: '100',
                channelId: '200',
                algorithm: OLM_ALGORITHM,
                senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                sessionId: '300',
                content: 'First secret encrypted message!',
            }),
            bobsUserId,
        )
        expect(envelope).toBeDefined()
        const event = new RiverEvent({
            payload: {
                parsed_event: make_UserPayload_ToDevice({
                    // key request or response
                    op: ToDeviceOp.TDO_KEY_REQUEST,
                    message: envelope,
                    // deviceKey is curve25519 id key of recipient device
                    deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                    // senderKey is curve25519 id key of sender device
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    // todo: point to origin event for key responses
                }),
                creator_user_id: alicesClient.userId,
            },
        })
        expect(event.event.content).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.shouldAttemptEncryption()).toBe(false)
        expect(event.getWireContentToDevice().content.ciphertext).toBeDefined()
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

        // create a message to encrypt with Bob's devices over Olm
        const envelope = await alicesClient.createOlmEncryptedCipherFromEvent(
            make_ToDevice_KeyRequest({
                spaceId: '100',
                channelId: '200',
                algorithm: OLM_ALGORITHM,
                senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                sessionId: '300',
                content: 'First secret encrypted message!',
            }),
            bobsUserId,
        )
        expect(envelope).toBeDefined()
        const event = new RiverEvent({
            payload: {
                parsed_event: make_UserPayload_ToDevice({
                    // key request or response
                    op: ToDeviceOp.TDO_KEY_REQUEST,
                    message: envelope,
                    // deviceKey is curve25519 id key of recipient device
                    deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                    // senderKey is curve25519 id key of sender device
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    // todo: point to origin event for key responses
                }),
                creator_user_id: alicesClient.userId,
            },
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.shouldAttemptEncryption()).toBe(false)
        const ciphertext = event.getWireContentToDevice().content.ciphertext
        expect(ciphertext).toBeDefined()
        event.setClearData({ clearEvent: { content: {} } })
        await expect(
            bobsClient.decryptEventIfNeeded(event, { forceRedecryptIfUntrusted: true }),
        ).toResolve()
        const clearEvent = event.getClearToDeviceMessage_KeyRequest()
        expect(clearEvent).toBeDefined()
        expect(clearEvent?.content).toContain('First secret encrypted message!')
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

        // create a message to encrypt with Bob's devices over Olm
        const envelope = await alicesClient.createOlmEncryptedCipherFromEvent(
            make_ToDevice_KeyRequest({
                spaceId: '100',
                channelId: '200',
                algorithm: OLM_ALGORITHM,
                senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                sessionId: '300',
                content: 'First secret encrypted message!',
            }),
            bobsUserId,
        )
        expect(envelope).toBeDefined()
        const event = new RiverEvent({
            payload: {
                parsed_event: make_UserPayload_ToDevice({
                    // key request or response
                    op: ToDeviceOp.TDO_KEY_REQUEST,
                    message: envelope,
                    // deviceKey is curve25519 id key of recipient device
                    deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                    // senderKey is curve25519 id key of sender device
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    // todo: point to origin event for key responses
                }),
                creator_user_id: alicesClient.userId,
            },
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(true)
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        expect(event.getWireContentToDevice().content.ciphertext).toBeDefined()
        expect(event.getContentToDevice().content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearEvent = event.getClearToDeviceMessage_KeyRequest()
        expect(clearEvent).toBeDefined()
        expect(clearEvent?.content).toContain('First secret encrypted message!')
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

        // create a message to encrypt
        const envelope = await alicesClient.createOlmEncryptedCipherFromEvent(
            make_ToDevice_KeyRequest({
                spaceId: '100',
                channelId: '200',
                algorithm: OLM_ALGORITHM,
                senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                sessionId: '300',
                content: 'First secret encrypted message!',
            }),
            bobsUserId,
        )
        expect(envelope).toBeDefined()
        const event = new RiverEvent({
            payload: {
                parsed_event: make_UserPayload_ToDevice({
                    // key request or response
                    op: ToDeviceOp.TDO_KEY_REQUEST,
                    message: envelope,
                    // deviceKey is curve25519 id key of recipient device
                    deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                    // senderKey is curve25519 id key of sender device
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    // todo: point to origin event for key responses
                }),
                creator_user_id: alicesClient.userId,
            },
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        expect(event.shouldAttemptDecryption()).toBe(true)
        const ciphertext = event.getWireContentToDevice().content.ciphertext
        expect(ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        if (!ciphertext) {
            throw new Error('Ciphertext not found')
        }
        expect(event.getClearContent()).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearEvent = event.getClearToDeviceMessage_KeyRequest()
        expect(clearEvent).toBeDefined()
        expect(clearEvent?.content).toContain('First secret encrypted message!')
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
            const envelope = await alicesClient.createOlmEncryptedCipherFromEvent(
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    sessionId: '300',
                    content: JSON.stringify(payload),
                }),
                bobsUserId,
            )

            const event = new RiverEvent({
                payload: {
                    parsed_event: make_UserPayload_ToDevice({
                        // key request or response
                        op: ToDeviceOp.TDO_KEY_REQUEST,
                        message: envelope,
                        // deviceKey is curve25519 id key of recipient device
                        deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                        // senderKey is curve25519 id key of sender device
                        senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                        // todo: point to origin event for key responses
                    }),
                    creator_user_id: alicesClient.userId,
                },
            })
            // ensure olm session with bob
            expect(event.event.content).toBeDefined()
            expect(event.shouldAttemptDecryption()).toBe(true)
            expect(event.shouldAttemptEncryption()).toBe(false)
            const ciphertext = event.getWireContentToDevice().content.ciphertext
            expect(ciphertext).toBeDefined()
            const senderKey = alicesClient.olmDevice.deviceCurve25519Key
            if (!senderKey) {
                throw new Error('Sender key not found')
            }
            if (!ciphertext) {
                throw new Error('Ciphertext not found')
            }

            await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
            const clearEvent = event.getClearToDeviceMessage_KeyRequest()
            expect(clearEvent).toBeDefined()
            expect(clearEvent?.content).toContain(values[i])
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

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: '324523',
                    sessionId: '300',
                    content: 'First secret encrypted message!',
                }),
                algorithm: OLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { userIds: [bobsUserId] })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        const ciphertext = event.getWireContentToDevice().content.ciphertext
        expect(ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        if (!ciphertext) {
            throw new Error('Ciphertext not found')
        }
        // create a message event from the encrypted event and decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            algorithm: OLM_ALGORITHM,
            text: Object.values(ciphertext)[0].body,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        expect(encryptedEvent.getContentChannel().content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearEvent = event.getClearToDeviceMessage_KeyRequest()
        expect(clearEvent).toBeDefined()
        expect(clearEvent?.content).toContain('First secret encrypted message!')
    })
})
