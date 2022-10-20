import { afterAll, beforeAll, describe, test } from '@jest/globals'
import {
    makeEvent,
    makeEvents,
    makeSpaceStreamId,
    makeUserStreamId,
    StreamKind,
    SyncStreamsResult,
    ZionServiceInterface,
} from '@zion/core'
import debug from 'debug'
import { Wallet } from 'ethers'
import { nanoid } from 'nanoid'
import { startZionApp, ZionApp } from '../app'
import { makeEvent_test, makeTestParams } from './util.test'

const log = debug('test:bobAndAliceSendAMessage')

describe('BobAndAliceSendAMessageViaRpc', () => {
    let zionApp: ZionApp

    beforeAll(async () => {
        zionApp = startZionApp(0, 'redis')
    })

    afterAll(async () => {
        await zionApp.stop()
    })

    let bobsWallet: Wallet
    let alicesWallet: Wallet

    beforeEach(async () => {
        bobsWallet = Wallet.createRandom()
        alicesWallet = Wallet.createRandom()
    })

    const testParams = () => makeTestParams(() => zionApp)

    test.each(testParams())(
        'bobTalksToHimself-%s',
        async (method: string, makeService: () => ZionServiceInterface) => {
            log('bobTalksToHimself', method, 'start')

            const bob = makeService()
            await bob.createUser({
                events: [
                    makeEvent(
                        bobsWallet,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(bobsWallet.address),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })
            log('bobTalksToHimself Bob created user, about to create space')

            // Bob creates space and channel
            const spaceId = makeSpaceStreamId('bobs-space-' + nanoid())
            await bob.createSpace({
                events: makeEvents(
                    bobsWallet,
                    [
                        {
                            kind: 'inception',
                            streamId: spaceId,
                            data: { streamKind: StreamKind.Space },
                        },
                        {
                            kind: 'join',
                            userId: bobsWallet.address,
                        },
                    ],
                    [],
                ),
            })
            log('bobTalksToHimself Bob created space, about to create channel')

            const channelId = makeSpaceStreamId('bobs-channel-' + nanoid())
            const channelEvents = makeEvents(
                bobsWallet,
                [
                    {
                        kind: 'inception',
                        streamId: channelId,
                        data: { streamKind: StreamKind.Channel, spaceId },
                    },
                    {
                        kind: 'join',
                        userId: bobsWallet.address,
                    },
                ],
                [],
            )
            await bob.createChannel({
                events: channelEvents,
            })

            // Bob reads stream to get sync cookie.
            log('bobTalksToHimself Bob created channel, reads it back')
            const channel = await bob.getEventStream({ streamId: channelId })

            // Bob starts sync on the channel
            log('bobTalksToHimself Bob starts sync')
            let syncResult: SyncStreamsResult | null = null
            const syncPromise = bob
                .syncStreams({
                    syncPositions: [
                        {
                            streamId: channelId,
                            syncCookie: channel.syncCookie,
                        },
                    ],
                    timeoutMs: 29000,
                })
                .then((result) => {
                    syncResult = result
                    return 'done'
                })
            expect(syncResult).toBeNull()

            // Bob succesdfully posts a message
            log('bobTalksToHimself Bob posts a message')
            const event = makeEvent(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
                channelEvents[1].hash,
            ])
            await bob.addEvent({
                streamId: channelId,
                event,
            })

            log('bobTalksToHimself Bob waits for sync to complete')

            // Bob sees the message in sync result
            await expect(syncPromise).resolves.toBe('done')
            expect(syncResult).not.toBeNull()
            expect(syncResult!.streams).toHaveProperty(channelId)
            expect(syncResult!.streams[channelId].events).toEqual([event])

            log("bobTalksToHimself Bob can't post event without previous event hashes")
            const badEvent = makeEvent_test(
                bobsWallet,
                { kind: 'message', text: 'Hello, world!' },
                [],
            )
            await expect(
                bob.addEvent({
                    streamId: channelId,
                    event: badEvent,
                }),
            ).rejects.toThrow()

            log('bobTalksToHimself done')
        },
    )

    test.each(testParams())(
        'bobAndAliceSendAMessage-%s',
        async (method: string, makeService: () => ZionServiceInterface) => {
            const bob = makeService()
            const alice = makeService()
            // Create accounts for Bob and Alice
            await bob.createUser({
                events: [
                    makeEvent(
                        bobsWallet,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(bobsWallet.address),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })

            await alice.createUser({
                events: [
                    makeEvent(
                        alicesWallet,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(alicesWallet.address),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })

            // Bob creates space and channel
            const spaceId = makeSpaceStreamId('bobs-space-' + nanoid())
            await bob.createSpace({
                events: makeEvents(
                    bobsWallet,
                    [
                        {
                            kind: 'inception',
                            streamId: spaceId,
                            data: { streamKind: StreamKind.Space },
                        },
                        {
                            kind: 'join',
                            userId: bobsWallet.address,
                        },
                    ],
                    [],
                ),
            })

            const channelId = makeSpaceStreamId('bobs-channel-' + nanoid())
            const channelEvents = makeEvents(
                bobsWallet,
                [
                    {
                        kind: 'inception',
                        streamId: channelId,
                        data: { streamKind: StreamKind.Channel, spaceId },
                    },
                    {
                        kind: 'join',
                        userId: bobsWallet.address,
                    },
                ],
                [],
            )
            await bob.createChannel({
                events: channelEvents,
            })
            let lastChannelHash = channelEvents[1].hash

            // Bob succesdfully posts a message
            const firstMessage = makeEvent(bobsWallet, { kind: 'message', text: 'Hello, world!' }, [
                lastChannelHash,
            ])
            lastChannelHash = firstMessage.hash
            await bob.addEvent({
                streamId: channelId,
                event: firstMessage,
            })

            // Alice fails to post a message if she hasn't joined the channel
            await expect(
                alice.addEvent({
                    streamId: channelId,
                    event: makeEvent(alicesWallet, { kind: 'message', text: 'Hello, world!' }, [
                        lastChannelHash,
                    ]),
                }),
            ).rejects.toThrow()

            // Alice syncs her user stream waiting for invite
            const aliceStreamId = makeUserStreamId(alicesWallet.address)
            const userAlice = await alice.getEventStream({
                streamId: aliceStreamId,
            })
            let aliceSyncCookie = userAlice.syncCookie
            let aliceSyncResult: SyncStreamsResult | null = null
            let aliceSyncPromise = alice
                .syncStreams({
                    syncPositions: [
                        {
                            streamId: aliceStreamId,
                            syncCookie: aliceSyncCookie,
                        },
                    ],
                    timeoutMs: 29000,
                })
                .then((result) => {
                    aliceSyncResult = result
                    return 'done'
                })
            expect(aliceSyncResult).toBeNull()

            // Bob invites Alice to the channel
            // There are two different events: one is to the channel itself
            // and the other is to the user stream of the invitee to notify invitee.
            const inviteEventInChannel = makeEvent(
                bobsWallet,
                { kind: 'invite', userId: alicesWallet.address },
                [lastChannelHash],
            )
            lastChannelHash = inviteEventInChannel.hash
            await bob.addEvent({
                streamId: channelId,
                event: inviteEventInChannel,
            })

            // Alice sees the invite in her user stream
            await expect(aliceSyncPromise).resolves.toBe('done')
            expect(aliceSyncResult).not.toBeNull()
            expect(aliceSyncResult!.streams).toHaveProperty(aliceStreamId)
            expect(aliceSyncResult!.streams[aliceStreamId].events).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        base: expect.objectContaining({
                            payload: expect.objectContaining({
                                kind: 'user-invited',
                                streamId: channelId,
                                inviterId: bobsWallet.address,
                            }),
                        }),
                    }),
                ]),
            )
            aliceSyncCookie = aliceSyncResult!.streams[aliceStreamId].syncCookie

            // Alice syncs her user stream again
            aliceSyncResult = null
            aliceSyncPromise = alice
                .syncStreams({
                    syncPositions: [
                        {
                            streamId: aliceStreamId,
                            syncCookie: aliceSyncCookie,
                        },
                    ],
                    timeoutMs: 29000,
                })
                .then((result) => {
                    aliceSyncResult = result
                    return 'done'
                })
            expect(aliceSyncResult).toBeNull()

            // Alice joins the channel
            const joinEventInChannel = makeEvent(
                alicesWallet,
                { kind: 'join', userId: alicesWallet.address },
                [lastChannelHash],
            )
            lastChannelHash = joinEventInChannel.hash
            await alice.addEvent({
                streamId: channelId,
                event: joinEventInChannel,
            })

            // Alice sees derived join event in her user stream
            await expect(aliceSyncPromise).resolves.toBe('done')
            expect(aliceSyncResult).not.toBeNull()
            expect(aliceSyncResult!.streams).toHaveProperty(aliceStreamId)
            expect(aliceSyncResult!.streams[aliceStreamId].events).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        base: expect.objectContaining({
                            payload: expect.objectContaining({
                                kind: 'user-joined',
                                streamId: channelId,
                            }),
                        }),
                    }),
                ]),
            )
            aliceSyncCookie = aliceSyncResult!.streams[aliceStreamId].syncCookie

            // Alice reads previouse messages from the channel
            const channel = await alice.getEventStream({ streamId: channelId })
            expect(channel.events).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        base: expect.objectContaining({
                            payload: expect.objectContaining({ text: 'Hello, world!' }),
                        }),
                    }),
                ]),
            )

            // Alice syncs both her user stream and the channel
            aliceSyncResult = null
            aliceSyncPromise = alice
                .syncStreams({
                    syncPositions: [
                        {
                            streamId: aliceStreamId,
                            syncCookie: aliceSyncCookie,
                        },
                        {
                            streamId: channelId,
                            syncCookie: channel.syncCookie,
                        },
                    ],
                    timeoutMs: 29000,
                })
                .then((result) => {
                    aliceSyncResult = result
                    return 'done'
                })
            expect(aliceSyncResult).toBeNull()

            // Bob posts another message
            await bob.addEvent({
                streamId: channelId,
                event: makeEvent(bobsWallet, { kind: 'message', text: 'Hello, Alice!' }, [
                    lastChannelHash,
                ]),
            })

            // Alice sees the message in sync result
            await expect(aliceSyncPromise).resolves.toBe('done')
            expect(aliceSyncResult).not.toBeNull()
            expect(aliceSyncResult!.streams).toHaveProperty(channelId)
            expect(aliceSyncResult!.streams[channelId].events).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        base: expect.objectContaining({
                            payload: expect.objectContaining({ text: 'Hello, Alice!' }),
                        }),
                    }),
                ]),
            )
        },
    )
})
