import { Client } from './client'
import { makeTestClient } from './util.test'
import { KeyResponseKind, OlmMessage, ToDeviceMessage, UserPayload_ToDevice } from '@river/proto'
import { make_ToDevice_KeyResponse } from './types'
import { dlog } from './dlog'

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

    test('clientCanEncryptEvent', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        const message = new ToDeviceMessage(
            make_ToDevice_KeyResponse({
                kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                streamId: '200',
                sessions: [],
            }),
        )

        const olmMessage = new OlmMessage({ content: message })
        // create a message to encrypt with Bob's devices over Olm
        const envelope = alicesClient.encryptOlm(olmMessage, [bobsClient.userDeviceKey()])
        expect(envelope).toBeDefined()
    })

    test('clientCanEncryptDecryptEvent', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        const message = new ToDeviceMessage(
            make_ToDevice_KeyResponse({
                streamId: '200',
                kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                sessions: [],
            }),
        )
        const olmMessage = new OlmMessage({ content: message })
        // create a message to encrypt with Bob's devices over Olm
        const envelope = await alicesClient.encryptOlm(olmMessage, [bobsClient.userDeviceKey()])
        expect(envelope).toBeDefined()
        const event = {
            // key request or response
            message: envelope,
            // deviceKey is curve25519 id key of recipient device
            deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
            // senderKey is curve25519 id key of sender device
            senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
            // todo: point to origin event for key responses
        }
        const payload = new UserPayload_ToDevice(event)
        // ensure olm session with bob
        const clear = await bobsClient.decryptOlmEvent(
            envelope.toDeviceMessages[bobsClient.userDeviceKey().deviceKey],
            payload.senderKey,
        )
        expect(clear).toBeDefined()
        expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('200')
    })

    test('clientCanEncryptDecryptToDeviceMultipleEventObjects', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.initializeUser()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        const values = ['200', '201']
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
            const message = new ToDeviceMessage(
                make_ToDevice_KeyResponse({
                    streamId: payload.content.key,
                    kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                    sessions: [],
                }),
            )
            const olmMessage = new OlmMessage({ content: message })
            // create a message to encrypt
            const envelope = await alicesClient.encryptOlm(olmMessage, [bobsClient.userDeviceKey()])

            expect(envelope).toBeDefined()
            const event = {
                message: envelope,
                // deviceKey is curve25519 id key of recipient device
                deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                // senderKey is curve25519 id key of sender device
                senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                // todo: point to origin event for key responses
            }
            log('event', event)
            // ensure olm session with bob

            const senderKey = alicesClient.olmDevice.deviceCurve25519Key
            if (!senderKey) {
                throw new Error('Sender key not found')
            }

            // ensure olm session with bob
            const clear = await bobsClient.decryptOlmEvent(
                envelope.toDeviceMessages[bobsClient.userDeviceKey().deviceKey],
                senderKey,
            )
            expect(clear).toBeDefined()
            expect(clear?.clearEvent?.content?.payload?.value?.streamId).toContain(values[i])
        }
    })
})
