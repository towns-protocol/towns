import { dlog } from './dlog'
import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { KeyResponseKind, ToDeviceMessage, ToDeviceOp, UserPayload_ToDevice } from '@river/proto'
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
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        // Alice gets created.
        await expect(alicesClient.initializeUser()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once(
            'toDeviceMessage',
            (streamId: string, event: UserPayload_ToDevice, senderUserId: string): void => {
                const content = event.message
                const senderKey = event.senderKey
                const deviceKey = event.deviceKey
                log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(streamId).toBe(aliceUserStreamId)
                    expect(content).toBeDefined()
                    const clear = await alicesClient.decryptOlmEvent(event, senderUserId)
                    expect(clear).toBeDefined()
                    expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('200')
                })
            },
        )
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.encryptAndSendToDeviceMessage(
                aliceUserId,
                new ToDeviceMessage(
                    make_ToDevice_KeyRequest({
                        streamId: '200',
                        algorithm: OLM_ALGORITHM,
                        senderKey: '324523',
                        sessionId: '300',
                    }),
                ),
                ToDeviceOp.TDO_UNSPECIFIED,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobSendsTwoAliceToDeviceMessage', async () => {
        log('bobSendsTwoAliceToDeviceMessage')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        // Alice gets created.
        await expect(alicesClient.initializeUser()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.on(
            'toDeviceMessage',
            (streamId: string, event: UserPayload_ToDevice, senderUserId: string): void => {
                const content = event.message
                const senderKey = event.senderKey
                const deviceKey = event.deviceKey
                log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(streamId).toBe(aliceUserStreamId)
                    expect(content).toBeDefined()
                    const clear = await alicesClient.decryptOlmEvent(event, senderUserId)
                    expect(clear).toBeDefined()
                    expect(clear.clearEvent.content?.payload.case).toBe('request')
                    expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('201')
                })
            },
        )
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.encryptAndSendToDeviceMessage(
                aliceUserId,
                new ToDeviceMessage(
                    make_ToDevice_KeyRequest({
                        streamId: '201',
                        algorithm: OLM_ALGORITHM,
                        senderKey: '324523',
                        sessionId: '300',
                    }),
                ),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await expect(
            bobsClient.encryptAndSendToDeviceMessage(
                aliceUserId,
                new ToDeviceMessage(
                    make_ToDevice_KeyRequest({
                        streamId: '200',
                        algorithm: OLM_ALGORITHM,
                        senderKey: '324523',
                        sessionId: '300',
                    }),
                ),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobSendsAliceToDevicesMessages', async () => {
        log('bobSendsAliceToDeviceMessages')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()

        // Alice gets created.
        await expect(alicesClient.initializeUser()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once(
            'toDeviceMessage',
            (streamId: string, event: UserPayload_ToDevice, senderUserId: string): void => {
                const content = event.message
                const senderKey = event.senderKey
                const deviceKey = event.deviceKey
                log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(streamId).toBe(aliceUserStreamId)
                    expect(content).toBeDefined()
                    const clear = await alicesClient.decryptOlmEvent(event, senderUserId)
                    expect(clear).toBeDefined()
                    expect(clear.clearEvent.content?.payload.case).toBe('request')
                    expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('202')
                })
            },
        )
        // bob sends a message to all Alice's devices.
        await expect(
            bobsClient.encryptAndSendToDeviceMessage(
                aliceUserId,
                new ToDeviceMessage(
                    make_ToDevice_KeyRequest({
                        streamId: '202',
                        algorithm: OLM_ALGORITHM,
                        senderKey: '324523',
                        sessionId: '300',
                    }),
                ),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
    })

    test('bobAndAliceExchangeToDeviceMessages', async () => {
        log('bobAndAliceExchangeToDeviceMessages')
        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()

        // Alice gets created.
        await expect(alicesClient.initializeUser()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        const bobUserStreamId = bobsClient.userStreamId
        const aliceUserId = alicesClient.userId
        const bobUserId = bobsClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        const bobSelfToDevice = makeDonePromise()
        alicesClient.once(
            'toDeviceMessage',
            (streamId: string, event: UserPayload_ToDevice, senderUserId: string): void => {
                const content = event.message
                const senderKey = event.senderKey
                const deviceKey = event.deviceKey
                log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(streamId).toBe(aliceUserStreamId)
                    expect(content).toBeDefined()
                    expect(event.op).toEqual(ToDeviceOp.TDO_KEY_REQUEST)
                    const clear = await alicesClient.decryptOlmEvent(event, senderUserId)
                    expect(clear).toBeDefined()
                    expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('204')
                    await expect(
                        alicesClient.encryptAndSendToDevicesMessage(
                            bobUserId,
                            new ToDeviceMessage(
                                make_ToDevice_KeyResponse({
                                    streamId: '203',
                                    sessions: [
                                        {
                                            streamId: '23432',
                                            sessionId: '23432',
                                            sessionKey: '3423',
                                        },
                                    ],
                                    kind: KeyResponseKind.KRK_KEYS_FOUND,
                                    content: 'Hi Bob, certainly!',
                                }),
                            ),
                            ToDeviceOp.TDO_KEY_RESPONSE,
                        ),
                    ).toResolve()
                })
            },
        )

        bobsClient.on(
            'toDeviceMessage',
            (streamId: string, event: UserPayload_ToDevice, senderUserId: string): void => {
                const content = event.message
                const senderKey = event.senderKey
                const deviceKey = event.deviceKey
                log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
                if (streamId == bobUserStreamId) {
                    bobSelfToDevice.runAndDoneAsync(async () => {
                        expect(content).toBeDefined()
                        expect(event.op).toBe(ToDeviceOp.TDO_KEY_RESPONSE)
                        const clear = await bobsClient.decryptOlmEvent(event, senderUserId)
                        expect(clear).toBeDefined()
                        expect(clear?.clearEvent?.content?.payload?.value?.streamId).toEqual('203')
                    })
                }
            },
        )
        // bob sends a key request message to all Alice's devices.
        await expect(
            bobsClient.encryptAndSendToDevicesMessage(
                aliceUserId,
                new ToDeviceMessage(
                    make_ToDevice_KeyRequest({
                        streamId: '204',
                        algorithm: OLM_ALGORITHM,
                        senderKey: 'alice sender key',
                        sessionId: '300',
                    }),
                ),
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
        await bobSelfToDevice.expectToSucceed()
    })
})
