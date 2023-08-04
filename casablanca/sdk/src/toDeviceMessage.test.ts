import { dlog } from './dlog'
import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { KeyResponseKind, ToDeviceOp } from '@towns/proto'
import { RiverEvent } from './event'
import { make_ToDevice_KeyRequest, make_ToDevice_KeyResponse } from './types'
import { OLM_ALGORITHM } from './crypto/olmLib'

const log = dlog('test')

describe('toDeviceMessageTest', () => {
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

    test('bobSendsAliceToDeviceMessage', async () => {
        log('bobSendsAliceToDeviceMessage')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        // Alice gets created.
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const content = event.getWireContentToDevice()
            const senderKey = content.content['sender_key']
            const deviceKey = content.content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content.content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                const clear = event.getClearToDeviceMessage_KeyRequest()
                expect(clear).toBeDefined()
                expect(clear?.content).toContain('Hi Alice!')
            })
        })
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: '324523',
                    sessionId: '300',
                    content: 'Hi Alice!',
                }),
                ToDeviceOp.TDO_UNSPECIFIED,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobSendsTwoAliceToDeviceMessage', async () => {
        log('bobSendsTwoAliceToDeviceMessage')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        // Alice gets created.
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentToDevice()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                expect(event.getWireContentToDevice().content?.op).toEqual('TDO_KEY_REQUEST')
                const clear = event.getClearToDeviceMessage_KeyRequest()
                expect(clear).toBeDefined()
                expect(clear?.content).toContain('Hi Alice!')
            })
        })
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: '324523',
                    sessionId: '300',
                    content: 'Hi Alice!',
                }),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: '324523',
                    sessionId: '300',
                    content: 'Hi Alice!',
                }),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobSendsAliceToDevicesMessages', async () => {
        log('bobSendsAliceToDeviceMessages')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()

        // Alice gets created.
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentToDevice()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                const clear = event.getClearToDeviceMessage_KeyRequest()
                expect(clear).toBeDefined()
                expect(clear?.content).toContain('Hi Alice!')
            })
        })
        // bob sends a message to all Alice's devices.
        await expect(
            bobsClient.sendToDevicesMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: '324523',
                    sessionId: '300',
                    content: 'Hi Alice!',
                }),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobSendsAliceToDevicesKeyRequestMessages', async () => {
        log('bobSendsAliceToDeviceMessages')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()

        // Alice gets created.
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentToDevice()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                const clear = event.getClearToDeviceMessage_KeyRequest()
                expect(clear).toBeDefined()
                expect(clear?.content).toContain('Hi Alice!')
            })
        })
        // bob sends a key request message to all Alice's devices.
        await expect(
            bobsClient.sendToDevicesMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: '324523',
                    sessionId: '300',
                    content: 'Hi Alice!',
                }),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobAndAliceExchangeToDeviceMessages', async () => {
        log('bobAndAliceExchangeToDeviceMessages')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()

        // Alice gets created.
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        const bobUserStreamId = bobsClient.userStreamId
        const aliceUserId = alicesClient.userId
        const bobUserId = bobsClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        const bobSelfToDevice = makeDonePromise()
        alicesClient.once('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentToDevice()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                expect(content['op']).toBe(ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST])
                await alicesClient.decryptEventIfNeeded(event)
                const clear = event.getClearToDeviceMessage_KeyRequest()
                expect(clear).toBeDefined()
                expect(clear?.content).toContain('Hi Alice!')
                await expect(
                    alicesClient.sendToDevicesMessage(
                        bobUserId,
                        make_ToDevice_KeyResponse({
                            spaceId: '100',
                            channelId: '200',
                            sessions: [
                                {
                                    senderKey: '23432',
                                    spaceId: '23432',
                                    channelId: '23432',
                                    sessionId: '23432',
                                    sessionKey: '3423',
                                },
                            ],
                            kind: KeyResponseKind.KRK_KEYS_FOUND,
                            content: 'Hi Bob, certainly!',
                        }),
                        ToDeviceOp.TDO_KEY_RESPONSE,
                    ),
                ).toResolve()
            })
        })

        bobsClient.on('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentToDevice()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            if (streamId == bobUserStreamId) {
                bobSelfToDevice.runAndDoneAsync(async () => {
                    expect(content).toBeDefined()
                    expect(content['op']).toBe(ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE])
                    await bobsClient.decryptEventIfNeeded(event)
                    const clearEvent = event.getClearToDeviceMessage_KeyResponse()
                    expect(clearEvent).toBeDefined()
                    expect(clearEvent?.content).toContain('Hi Bob, certainly!')
                })
            }
        })
        // bob sends a key request message to all Alice's devices.
        await expect(
            bobsClient.sendToDevicesMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '100',
                    channelId: '200',
                    algorithm: OLM_ALGORITHM,
                    senderKey: 'alice sender key',
                    sessionId: '300',
                    content: 'Hi Alice!',
                }),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
        await bobSelfToDevice.expectToSucceed()
    })
})
