import { Client } from './client'
import { makeTestClient } from './util.test'
import { OLM_ALGORITHM } from './crypto/olmLib'
import { make_ToDevice_KeyRequest } from './types'
import { ToDeviceMessage, ToDeviceOp, UserPayload_ToDevice } from '@river/proto'

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
        const envelope = await alicesClient.createOlmEncryptedEvent(
            new ToDeviceMessage(
                make_ToDevice_KeyRequest({
                    streamId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    sessionId: '300',
                    content: 'First secret encrypted message!',
                }),
            ),
            bobsUserId,
        )
        expect(envelope).toBeDefined()
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
        const envelope = await alicesClient.createOlmEncryptedEvent(
            new ToDeviceMessage(
                make_ToDevice_KeyRequest({
                    streamId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                    sessionId: '300',
                }),
            ),
            bobsUserId,
        )
        expect(envelope).toBeDefined()
        const event = {
            // key request or response
            op: ToDeviceOp.TDO_KEY_REQUEST,
            message: envelope,
            // deviceKey is curve25519 id key of recipient device
            deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
            // senderKey is curve25519 id key of sender device
            senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
            // todo: point to origin event for key responses
        }
        // ensure olm session with bob
        const clear = await bobsClient.decryptOlmEvent(
            new UserPayload_ToDevice(event),
            alicesClient.userId,
        )
        expect(clear).toBeDefined()
        expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('200')
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
            // create a message to encrypt
            const envelope = await alicesClient.createOlmEncryptedEvent(
                new ToDeviceMessage(
                    make_ToDevice_KeyRequest({
                        streamId: payload.content.key,
                        algorithm: OLM_ALGORITHM,
                        senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                        sessionId: '300',
                        content: JSON.stringify(payload),
                    }),
                ),
                bobsUserId,
            )

            expect(envelope).toBeDefined()
            const event = {
                // key request or response
                op: ToDeviceOp.TDO_KEY_REQUEST,
                message: envelope,
                // deviceKey is curve25519 id key of recipient device
                deviceKey: bobsClient.olmDevice.deviceCurve25519Key!,
                // senderKey is curve25519 id key of sender device
                senderKey: alicesClient.olmDevice.deviceCurve25519Key!,
                // todo: point to origin event for key responses
            }
            // ensure olm session with bob

            const senderKey = alicesClient.olmDevice.deviceCurve25519Key
            if (!senderKey) {
                throw new Error('Sender key not found')
            }

            // ensure olm session with bob
            const clear = await bobsClient.decryptOlmEvent(
                new UserPayload_ToDevice(event),
                alicesClient.userId,
            )
            expect(clear).toBeDefined()
            expect(clear?.clearEvent?.content?.payload?.value?.streamId).toContain(values[i])
        }
    })
})
