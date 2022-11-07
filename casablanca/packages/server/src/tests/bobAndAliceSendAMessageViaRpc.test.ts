import { afterAll, beforeAll, describe, test } from '@jest/globals'
import {
    genId,
    makeEvent,
    makeEvents,
    makeSpaceStreamId,
    makeUserStreamId,
    SignerContext,
    StreamKind,
    SyncStreamsResult,
    ZionServiceInterface,
} from '@zion/core'
import debug from 'debug'
import { startZionApp, ZionApp } from '../app'
import { makeEvent_test, makeRandomUserContext, makeTestParams } from './util.test'

const log = debug('test:bobAndAliceSendAMessage')

describe('BobAndAliceSendAMessageViaRpc', () => {
    let zionApp: ZionApp

    beforeAll(async () => {
        log('beforeAll', 'starting app')
        zionApp = startZionApp(0, 'postgres')
        log('beforeAll', 'app started')
    })

    afterAll(async () => {
        log('afterAll', 'stopping app')
        await zionApp.stop()
        log('afterAll', 'app stopped')
    })

    let bobsContext: SignerContext
    let alicesContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
        alicesContext = await makeRandomUserContext()
    })

    const testParams = () => makeTestParams(() => zionApp)

    const stopIfClient = (service: ZionServiceInterface): void => {
        if (service.hasOwnProperty('rpcClient')) {
            log('Stopping client')
            ;(service as any).close()
        }
    }

    test.each(testParams())(
        'bobTalksToHimself-%s',
        async (method: string, makeService: () => ZionServiceInterface) => {
            log('bobTalksToHimself', method, 'start')

            const bob = makeService()
            await bob.createUser({
                events: [
                    makeEvent(
                        bobsContext,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(bobsContext.creatorAddress),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })
            log('bobTalksToHimself Bob created user, about to create space')

            // Bob creates space and channel
            const spaceId = makeSpaceStreamId('bobs-space-' + genId())
            await bob.createSpace({
                events: makeEvents(
                    bobsContext,
                    [
                        {
                            kind: 'inception',
                            streamId: spaceId,
                            data: { streamKind: StreamKind.Space },
                        },
                        {
                            kind: 'join',
                            userId: bobsContext.creatorAddress,
                        },
                    ],
                    [],
                ),
            })
            log('bobTalksToHimself Bob created space, about to create channel')

            const channelId = makeSpaceStreamId('bobs-channel-' + genId())
            const channelEvents = makeEvents(
                bobsContext,
                [
                    {
                        kind: 'inception',
                        streamId: channelId,
                        data: { streamKind: StreamKind.Channel, spaceId },
                    },
                    {
                        kind: 'join',
                        userId: bobsContext.creatorAddress,
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
            const event = makeEvent(bobsContext, { kind: 'message', text: 'Hello, world!' }, [
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
                bobsContext,
                { kind: 'message', text: 'Hello, world!' },
                [],
            )
            await expect(
                bob.addEvent({
                    streamId: channelId,
                    event: badEvent,
                }),
            ).rejects.toThrow()

            log('stopping client')
            stopIfClient(bob)
            log('bobTalksToHimself', method, 'done')
        },
    )

    test.each(testParams())(
        'bobAndAliceConverse-%s',
        async (method: string, makeService: () => ZionServiceInterface) => {
            log('bobAndAliceConverse', method, 'start')

            const bob = makeService()
            const alice = makeService()
            // Create accounts for Bob and Alice
            await bob.createUser({
                events: [
                    makeEvent(
                        bobsContext,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(bobsContext.creatorAddress),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })

            await alice.createUser({
                events: [
                    makeEvent(
                        alicesContext,
                        {
                            kind: 'inception',
                            streamId: makeUserStreamId(alicesContext.creatorAddress),
                            data: { streamKind: StreamKind.User },
                        },
                        [],
                    ),
                ],
            })

            // Bob creates space and channel
            const spaceId = makeSpaceStreamId('bobs-space-' + genId())
            await bob.createSpace({
                events: makeEvents(
                    bobsContext,
                    [
                        {
                            kind: 'inception',
                            streamId: spaceId,
                            data: { streamKind: StreamKind.Space },
                        },
                        {
                            kind: 'join',
                            userId: bobsContext.creatorAddress,
                        },
                    ],
                    [],
                ),
            })

            const channelId = makeSpaceStreamId('bobs-channel-' + genId())
            const channelEvents = makeEvents(
                bobsContext,
                [
                    {
                        kind: 'inception',
                        streamId: channelId,
                        data: { streamKind: StreamKind.Channel, spaceId },
                    },
                    {
                        kind: 'join',
                        userId: bobsContext.creatorAddress,
                    },
                ],
                [],
            )
            await bob.createChannel({
                events: channelEvents,
            })
            let lastChannelHash = channelEvents[1].hash

            // Bob succesdfully posts a message
            const firstMessage = makeEvent(
                bobsContext,
                { kind: 'message', text: 'Hello, world!' },
                [lastChannelHash],
            )
            lastChannelHash = firstMessage.hash
            await bob.addEvent({
                streamId: channelId,
                event: firstMessage,
            })

            // Alice fails to post a message if she hasn't joined the channel
            await expect(
                alice.addEvent({
                    streamId: channelId,
                    event: makeEvent(alicesContext, { kind: 'message', text: 'Hello, world!' }, [
                        lastChannelHash,
                    ]),
                }),
            ).rejects.toThrow()

            // Alice syncs her user stream waiting for invite
            const aliceStreamId = makeUserStreamId(alicesContext.creatorAddress)
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
                bobsContext,
                { kind: 'invite', userId: alicesContext.creatorAddress },
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
                                inviterId: bobsContext.creatorAddress,
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
                alicesContext,
                { kind: 'join', userId: alicesContext.creatorAddress },
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
                event: makeEvent(bobsContext, { kind: 'message', text: 'Hello, Alice!' }, [
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

            log('stopping clients')
            stopIfClient(bob)
            stopIfClient(alice)
            log('bobAndAliceConverse', method, 'done')
        },
    )
})
