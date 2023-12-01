import { dlog } from './dlog'
import { Client } from './client'
import { makeDonePromise, makeTestClient } from './util.test'
import { KeyResponseKind, ToDeviceMessage } from '@river/proto'
import { make_ToDevice_KeyResponse } from './types'
import { UserDeviceCollection } from './crypto/olmLib'

const log = dlog('test:toDeviceMessage')

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
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once(
            'toDeviceMessageDecrypted',
            (streamId: string, eventId: string, clear, _senderUserId: string): void => {
                log('toDeviceMessage for Alice', streamId, clear)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(clear).toBeDefined()
                    expect(clear?.content?.payload?.value?.streamId).toEqual('200')
                })
            },
        )

        const recipients: UserDeviceCollection = {}
        recipients[alicesClient.userId] = [alicesClient.userDeviceKey()]

        // bob sends a message to Alice's device.
        await expect(
            bobsClient.encryptAndSendToDevices(
                recipients,
                new ToDeviceMessage(
                    make_ToDevice_KeyResponse({
                        streamId: '200',
                        kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                        sessions: [],
                    }),
                ),
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
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.on(
            'toDeviceMessageDecrypted',
            (streamId: string, eventId: string, clear, _senderUserId: string): void => {
                log('toDeviceMessage for Alice', streamId, clear)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(clear).toBeDefined()
                    expect(clear.content?.payload.case).toBe('response')
                    expect(clear.content?.payload?.value?.streamId).toEqual('201')
                })
            },
        )

        const bobToAliceRecipients: UserDeviceCollection = {}
        bobToAliceRecipients[alicesClient.userId] = [alicesClient.userDeviceKey()]
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.encryptAndSendToDevices(
                bobToAliceRecipients,
                new ToDeviceMessage(
                    make_ToDevice_KeyResponse({
                        streamId: '201',
                        kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                        sessions: [],
                    }),
                ),
            ),
        ).toResolve()

        await expect(
            bobsClient.encryptAndSendToDevices(
                bobToAliceRecipients,
                new ToDeviceMessage(
                    make_ToDevice_KeyResponse({
                        streamId: '200',
                        kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                        sessions: [],
                    }),
                ),
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
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once(
            'toDeviceMessageDecrypted',
            (streamId: string, eventId: string, clear, _senderUserId: string): void => {
                log('toDeviceMessage for Alice', streamId)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(streamId).toBe(aliceUserStreamId)
                    expect(clear).toBeDefined()
                    expect(clear.content?.payload.case).toBe('response')
                    expect(clear.content?.payload?.value?.streamId).toEqual('202')
                })
            },
        )

        const bobToAliceRecipients: UserDeviceCollection = {}
        bobToAliceRecipients[alicesClient.userId] = [alicesClient.userDeviceKey()]
        // bob sends a message to all Alice's devices.
        await expect(
            bobsClient.encryptAndSendToDevices(
                bobToAliceRecipients,
                new ToDeviceMessage(
                    make_ToDevice_KeyResponse({
                        streamId: '202',
                        kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                        sessions: [],
                    }),
                ),
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
        const bobUserId = bobsClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        const bobSelfToDevice = makeDonePromise()
        alicesClient.once(
            'toDeviceMessageDecrypted',
            (streamId: string, eventId: string, clear, _senderUserId: string): void => {
                log('toDeviceMessage for Alice', streamId, clear)
                aliceSelfToDevice.runAndDoneAsync(async () => {
                    expect(streamId).toBe(aliceUserStreamId)
                    expect(clear).toBeDefined()
                    expect(clear.content?.payload?.value?.streamId).toEqual('204')

                    const aliceToBobRecipients: UserDeviceCollection = {}
                    aliceToBobRecipients[bobUserId] = [bobsClient.userDeviceKey()]
                    await expect(
                        alicesClient.encryptAndSendToDevices(
                            aliceToBobRecipients,
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
                        ),
                    ).toResolve()
                })
            },
        )

        bobsClient.on(
            'toDeviceMessageDecrypted',
            (streamId: string, eventId: string, clear, _senderUserId: string): void => {
                log('toDeviceMessage for Alice', streamId, clear)
                if (streamId == bobUserStreamId) {
                    bobSelfToDevice.runAndDoneAsync(async () => {
                        expect(clear).toBeDefined()
                        expect(clear.content?.payload?.value?.streamId).toEqual('203')
                    })
                }
            },
        )

        const bobToAliceRecipients: UserDeviceCollection = {}
        bobToAliceRecipients[alicesClient.userId] = [alicesClient.userDeviceKey()]
        // bob sends a key request message to all Alice's devices.
        await expect(
            bobsClient.encryptAndSendToDevices(
                bobToAliceRecipients,
                new ToDeviceMessage(
                    make_ToDevice_KeyResponse({
                        streamId: '204',
                        kind: KeyResponseKind.KRK_KEYS_NOT_FOUND,
                        sessions: [],
                    }),
                ),
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()
        await bobSelfToDevice.expectToSucceed()
    })
})
