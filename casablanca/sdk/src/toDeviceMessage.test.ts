import { dlog } from './dlog'
import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { ToDeviceMessage_KeyRequest, ToDeviceOp } from '@towns/proto'
import { RiverEvent } from './event'
import { getToDevicePayloadContent } from './types'

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
            const content = event.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                expect(event.getPlainContent().payload).toContain('Hi Alice!')
            })
        })
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                {
                    content: 'Hi Alice!',
                },
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
            const content = event.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                expect(event.getWireContent().op).toEqual('TDO_KEY_REQUEST')
                expect(event.getPlainContent().payload).toContain('Hi Alice!')
            })
        })
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                {
                    content: 'Hi Alice!',
                },
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                {
                    content: 'Hi Again Alice!',
                },
                ToDeviceOp.TDO_UNSPECIFIED,
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
            const content = event.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                expect(event.getPlainContent().payload).toContain('Hi Alice!')
            })
        })
        // bob sends a message to all Alice's devices.
        await expect(
            bobsClient.sendToDevicesMessage(
                aliceUserId,
                {
                    content: 'Hi Alice!',
                },
                ToDeviceOp.TDO_UNSPECIFIED,
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
            const content = event.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                await alicesClient.decryptEventIfNeeded(event)
                expect(event.getPlainContent().payload).toContain('Hi Alice!')
            })
        })
        // bob sends a key request message to all Alice's devices.
        await expect(
            bobsClient.sendToDevicesMessage(
                aliceUserId,
                {
                    content: 'Hi Alice!',
                },
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
            const content = event.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            aliceSelfToDevice.runAndDoneAsync(async () => {
                expect(streamId).toBe(aliceUserStreamId)
                expect(content).toBeDefined()
                expect(content['op']).toBe(ToDeviceOp[ToDeviceOp.TDO_KEY_REQUEST])
                await alicesClient.decryptEventIfNeeded(event)
                const rawContent = JSON.stringify(
                    // todo: HNT-1800 tighten types in RiverEvent such that proto type is returned not any.
                    (JSON.parse(event.getPlainContent().payload) as { content: object }).content,
                )
                const op = event.event.content?.op
                // test payload protobuf
                const toDevicePayload = getToDevicePayloadContent(rawContent, op as string)
                expect(toDevicePayload).toBeDefined()
                expect(toDevicePayload instanceof ToDeviceMessage_KeyRequest).toBe(true)
                expect(event.getPlainContent().payload).toContain('alice sender key')
                await expect(
                    alicesClient.sendToDevicesMessage(
                        bobUserId,
                        {
                            content: 'Hi Bob, certainly!',
                        },
                        ToDeviceOp.TDO_KEY_RESPONSE,
                    ),
                ).toResolve()
            })
        })

        bobsClient.on('toDeviceMessage', (streamId: string, event: RiverEvent): void => {
            const content = event.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, content)
            if (streamId == bobUserStreamId) {
                bobSelfToDevice.runAndDoneAsync(async () => {
                    expect(content).toBeDefined()
                    expect(content['op']).toBe(ToDeviceOp[ToDeviceOp.TDO_KEY_RESPONSE])
                    await bobsClient.decryptEventIfNeeded(event)
                    expect(event.getPlainContent().payload).toContain('Hi Bob, certainly!')
                })
            }
        })
        // bob sends a key request message to all Alice's devices.
        await expect(
            bobsClient.sendToDevicesMessage(
                aliceUserId,
                {
                    space_id: '100',
                    channel_id: '200',
                    algorithm: 'OLM',
                    sender_key: 'alice sender key',
                    session_id: '300',
                },
                ToDeviceOp.TDO_KEY_REQUEST,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
        await bobSelfToDevice.expectToSucceed()
    })
})
