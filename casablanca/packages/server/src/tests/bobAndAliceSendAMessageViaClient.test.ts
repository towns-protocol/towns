import { afterAll, beforeAll, beforeEach, describe, expect, test } from '@jest/globals'
import { Client, makeZionRpcClient } from '@zion/client'
import {
    FullEvent,
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    MessagePayload,
    SignerContext,
    StreamKind,
} from '@zion/core'
import debug from 'debug'
import { startZionApp, ZionApp } from '../app'
import { makeDonePromise, makeTestClient } from './util.test'
import 'jest-extended'
import { config } from '../config'

const log = debug('test')

const testSuffix = config.testRemoteUrl === undefined ? '-viaClient' : '-remote'

describe('BobAndAliceSendAMessageViaClient', () => {
    let zionApp: ZionApp
    let url: string

    beforeAll(async () => {
        if (config.testRemoteUrl === undefined) {
            zionApp = startZionApp(0, 'postgres')
            url = zionApp.url
        } else {
            url = config.testRemoteUrl
        }
    })

    afterAll(async () => {
        if (zionApp !== undefined) {
            await zionApp.stop()
        }
    })

    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient(url)
        alicesClient = await makeTestClient(url)
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('clientsCanBeClosedNoSync' + testSuffix, async () => {})

    test('clientsCanBeClosedAfterSync' + testSuffix, async () => {
        await expect(bobsClient.createNewUser()).resolves.toBeUndefined()
        await expect(alicesClient.createNewUser()).resolves.toBeUndefined()
        bobsClient.startSync(3000)
        alicesClient.startSync(3000)
    })

    const bobCanReconnect = async () => {
        const bobsAnotherClient = await makeTestClient(url, bobsClient.signerContext)

        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, message: FullEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            done.runAndDone(() => {
                const payload = message.base.payload as MessagePayload
                expect(payload.text).toBe('Hello, again!')
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: StreamKind) => {
            log('streamInitialized', streamId, streamKind)
            done.run(() => {
                if (streamKind === StreamKind.Channel) {
                    const channel = bobsAnotherClient.stream(streamId)
                    log('channel content')
                    log(channel.rollup)

                    expect(Array.from(channel.rollup.messages.values())).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                base: expect.objectContaining({
                                    payload: expect.objectContaining({ text: 'Hello, world!' }),
                                }),
                            }),
                        ]),
                    )

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsAnotherClient.sendMessage(streamId, 'Hello, again!')
                }
            })
        }
        bobsAnotherClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsAnotherClient.loadExistingUser()).resolves.toBeUndefined()

        bobsAnotherClient.startSync(1000)

        await done.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }

    test('bobTalksToHimself' + testSuffix, async () => {
        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, message: FullEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            done.runAndDone(() => {
                const payload = message.base.payload as MessagePayload
                expect(payload.text).toBe('Hello, world!')
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: StreamKind) => {
            log('streamInitialized', streamId, streamKind)
            done.run(() => {
                if (streamKind === StreamKind.Channel) {
                    const channel = bobsClient.stream(streamId)
                    log('channel content')
                    log(channel.rollup)

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                }
            })
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.createNewUser()).resolves.toBeUndefined()

        bobsClient.startSync(1000)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.toBeUndefined()

        await expect(
            bobsClient.createChannel(makeChannelStreamId('bobs-channel-' + genId()), bobsSpaceId),
        ).resolves.toBeUndefined()

        await done.expectToSucceed()

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect()).resolves.toBe('done')

        log('pass2 done')
    })

    // TODO: undo skip
    test.skip('bobAndAliceConverse' + testSuffix, async () => {
        log('bobAndAliceConverse')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).resolves.toBeUndefined()
        bobsClient.startSync(1000)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.toBeUndefined()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        await expect(bobsClient.createChannel(bobsChannelId, bobsSpaceId)).resolves.toBeUndefined()

        // Alice gest created.
        await expect(alicesClient.createNewUser()).resolves.toBeUndefined()
        alicesClient.startSync(1000)

        // Bob can send a message.
        const bobSelfHello = makeDonePromise()
        bobsClient.once('channelNewMessage', (channelId: string, message: FullEvent): void => {
            const payload = message.base.payload as MessagePayload
            log('channelNewMessage', 'Bob Initial Message', channelId, payload.text)
            bobSelfHello.runAndDone(() => {
                // TODO: why 'Hello, world from Bob!' can be received here?
                expect(channelId).toBe(bobsChannelId)
                expect(payload.text).toBe('Hello, world from Bob!')
            })
        })

        await expect(
            bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!'),
        ).resolves.toBeUndefined()
        await bobSelfHello.expectToSucceed()

        // Alice can't sent a message to Bob's channel.
        // TODO: why is this not failing?
        //await expect(alicesClient.sendMessage(bobsChannelId, 'Hello, world from Alice!')).rejects.toThrow()

        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinChannel(streamId)).resolves.toBeUndefined()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.signerContext.creatorAddress)

        await aliceJoined.expectToSucceed()

        const aliceGetsMessage = makeDonePromise()
        const bobGetsMessage = makeDonePromise()
        const conversation = [
            'Hello, Alice!',
            'Hello, Bob!',
            'Weather nice?',
            'Sun and rain!',
            'Coffee or tea?',
            'Both!',
        ]

        alicesClient.on('channelNewMessage', (channelId: string, message: FullEvent): void => {
            const payload = message.base.payload as MessagePayload
            log('channelNewMessage', 'Alice', channelId, payload.text)
            aliceGetsMessage.run(() => {
                expect(channelId).toBe(bobsChannelId)
                // @ts-ignore
                expect(payload.text).toBeOneOf(conversation)
                if (payload.text === 'Hello, Alice!') {
                    alicesClient.sendMessage(channelId, 'Hello, Bob!')
                } else if (payload.text === 'Weather nice?') {
                    alicesClient.sendMessage(channelId, 'Sun and rain!')
                } else if (payload.text === 'Coffee or tea?') {
                    alicesClient.sendMessage(channelId, 'Both!')
                    aliceGetsMessage.done()
                }
            })
        })

        bobsClient.on('channelNewMessage', (channelId: string, message: FullEvent): void => {
            const payload = message.base.payload as MessagePayload
            log('channelNewMessage', 'Bob', channelId, payload.text)
            bobGetsMessage.run(() => {
                expect(channelId).toBe(bobsChannelId)
                // @ts-ignore
                expect(payload.text).toBeOneOf(conversation)
                if (payload.text === 'Hello, Bob!') {
                    bobsClient.sendMessage(channelId, 'Weather nice?')
                } else if (payload.text === 'Sun and rain!') {
                    bobsClient.sendMessage(channelId, 'Coffee or tea?')
                } else if (payload.text === 'Both!') {
                    bobGetsMessage.done()
                }
            })
        })

        await expect(
            bobsClient.sendMessage(bobsChannelId, 'Hello, Alice!'),
        ).resolves.toBeUndefined()

        log('Waiting for Alice to get messages...')
        await aliceGetsMessage.expectToSucceed()
        log('Waiting for Bob to get messages...')
        await bobGetsMessage.expectToSucceed()
        log('bobAndAliceConverse All done!')
    })
})
