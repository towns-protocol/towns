import { Client } from '@zion/client'
import {
    FullEvent,
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    MessagePayload,
    StreamKind,
} from '@zion/core'
import debug from 'debug'
import { startZionApp, ZionApp } from '../app'
import { makeDonePromise, makeTestClient } from './util.test'
import { config } from '../config'

const log = debug('test')

const testSuffix = config.testRemoteUrl === undefined ? '-viaClient' : '-remote'

describe('BobAndAliceSendAMessageViaClient', () => {
    let zionApp: ZionApp
    let url: string

    beforeAll(async () => {
        if (config.testRemoteUrl === undefined) {
            zionApp = startZionApp(0)
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
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(alicesClient.createNewUser()).toResolve()
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
                expect(parseText(payload.text)).toBe('Hello, again!')
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: StreamKind) => {
            log('streamInitialized', streamId, streamKind)
            done.run(() => {
                if (streamKind === StreamKind.Channel) {
                    const channel = bobsAnotherClient.stream(streamId)!
                    log('channel content')
                    log(channel.rollup)

                    expect(Array.from(channel.rollup.messages.values())).toEqual(
                        expect.arrayContaining([
                            expect.objectContaining({
                                base: expect.objectContaining({
                                    payload: expect.objectContaining({
                                        text: expect.stringContaining('Hello, world!'),
                                    }),
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

        await expect(bobsAnotherClient.loadExistingUser()).toResolve()

        bobsAnotherClient.startSync(1000)

        await done.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }

    function parseText(text: string): string {
        return JSON.parse(text).text
    }

    test('bobTalksToHimself' + testSuffix, async () => {
        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, message: FullEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            done.runAndDone(() => {
                const payload = message.base.payload as MessagePayload
                expect(parseText(payload.text)).toBe('Hello, world!')
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: StreamKind) => {
            log('streamInitialized', streamId, streamKind)
            done.run(() => {
                if (streamKind === StreamKind.Channel) {
                    const channel = bobsClient.stream(streamId)!
                    log('channel content')
                    log(channel.rollup)

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                }
            })
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.createNewUser()).toResolve()

        bobsClient.startSync(1000)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        await expect(
            bobsClient.createChannel(bobsSpaceId, makeChannelStreamId('bobs-channel-' + genId())),
        ).toResolve()

        await done.expectToSucceed()

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect()).toResolve()

        log('pass2 done')
    })

    test('bobSendsSingleMessage' + testSuffix, async () => {
        log('bobSendsSingleMessage')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        bobsClient.startSync(1000)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        await expect(bobsClient.createChannel(bobsSpaceId, bobsChannelId)).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // Bob can send a message.
        const bobSelfHello = makeDonePromise()
        bobsClient.once('channelNewMessage', (channelId: string, message: FullEvent): void => {
            const payload = message.base.payload as MessagePayload
            log('channelNewMessage', 'Bob Initial Message', channelId, parseText(payload.text))
            bobSelfHello.runAndDone(() => {
                // TODO: why 'Hello, world from Bob!' can be received here?
                expect(channelId).toBe(bobsChannelId)
                expect(parseText(payload.text)).toBe('Hello, world from Bob!')
            })
        })

        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!')).toResolve()
        await bobSelfHello.expectToSucceed()

        log('bobSendsSingleMessage done')
    })

    test('bobAndAliceConverse' + testSuffix, async () => {
        log('bobAndAliceConverse')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.createNewUser()).toResolve()
        bobsClient.startSync(1000)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        await expect(bobsClient.createChannel(bobsSpaceId, bobsChannelId)).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // Alice gest created.
        await expect(alicesClient.createNewUser()).toResolve()
        alicesClient.startSync(1000)

        // Bob can send a message.
        const bobSelfHello = makeDonePromise()
        bobsClient.once('channelNewMessage', (channelId: string, message: FullEvent): void => {
            const payload = message.base.payload as MessagePayload
            log('channelNewMessage', 'Bob Initial Message', channelId, parseText(payload.text))
            bobSelfHello.runAndDone(() => {
                // TODO: why 'Hello, world from Bob!' can be received here?
                expect(channelId).toBe(bobsChannelId)
                expect(parseText(payload.text)).toBe('Hello, world from Bob!')
            })
        })

        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!')).toResolve()
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
                await expect(alicesClient.joinChannel(streamId)).toResolve()
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
            log('channelNewMessage', 'Alice', channelId, parseText(payload.text))
            aliceGetsMessage.run(() => {
                expect(channelId).toBe(bobsChannelId)
                // @ts-ignore
                expect(parseText(payload.text)).toBeOneOf(conversation)
                if (parseText(payload.text) === 'Hello, Alice!') {
                    alicesClient.sendMessage(channelId, 'Hello, Bob!')
                } else if (parseText(payload.text) === 'Weather nice?') {
                    alicesClient.sendMessage(channelId, 'Sun and rain!')
                } else if (parseText(payload.text) === 'Coffee or tea?') {
                    alicesClient.sendMessage(channelId, 'Both!')
                    aliceGetsMessage.done()
                }
            })
        })

        bobsClient.on('channelNewMessage', (channelId: string, message: FullEvent): void => {
            const payload = message.base.payload as MessagePayload
            log('channelNewMessage', 'Bob', channelId, parseText(payload.text))
            bobGetsMessage.run(() => {
                expect(channelId).toBe(bobsChannelId)
                // @ts-ignore
                expect(parseText(payload.text)).toBeOneOf(conversation)
                if (parseText(payload.text) === 'Hello, Bob!') {
                    bobsClient.sendMessage(channelId, 'Weather nice?')
                } else if (parseText(payload.text) === 'Sun and rain!') {
                    bobsClient.sendMessage(channelId, 'Coffee or tea?')
                } else if (parseText(payload.text) === 'Both!') {
                    bobGetsMessage.done()
                }
            })
        })

        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, Alice!')).toResolve()

        log('Waiting for Alice to get messages...')
        await aliceGetsMessage.expectToSucceed()
        log('Waiting for Bob to get messages...')
        await bobGetsMessage.expectToSucceed()
        log('bobAndAliceConverse All done!')
    })
})
