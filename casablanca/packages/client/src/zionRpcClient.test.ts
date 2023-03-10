import { makeEvent, makeEvents, SignerContext, unpackEnvelope, unpackEnvelopes } from './sign'
import {
    Err,
    PayloadCaseType,
    Payload_Message,
    Payload_UserStreamOp,
    StreamKind,
    StreamOp,
    SyncStreamsResponse,
} from '@zion/proto'
import debug from 'debug'
import { makeEvent_test, makeRandomUserContext, TEST_URL } from './util.test'
import { makeZionRpcClient } from './zionRpcClient'
import _ from 'lodash'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { makeInceptionPayload, makeJoinableStreamPayload, makeMessagePayload } from './types'

const log = debug('test:zionRpcClient')

const makeTestRpcClient = () => makeZionRpcClient(TEST_URL)

describe('zionRpcClient', () => {
    let bobsContext: SignerContext
    let alicesContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
        alicesContext = await makeRandomUserContext()
    })

    test('makeZionRpcClient', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()
        const result = await client.info({})
        expect(result).toBeDefined()
        expect(result.graffiti).toEqual('TBD Project Name node welcomes you!')
        client.close()
    })

    test('error', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()
        await expect(client.info({ debug: 'error' })).rejects.toThrow(
            '[invalid_argument] 1:DEBUG_ERROR: Error requested through Info request',
        )
        client.close()
    })

    test('panic', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()
        await expect(client.info({ debug: 'panic' })).rejects.toThrow(
            '[internal] TypeError: fetch failed',
        )
        client.close()
    })

    test('bobTalksToHimself', async () => {
        log('bobTalksToHimself', 'start')

        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        await bob.createStream({
            events: [
                makeEvent(
                    bobsContext,
                    makeInceptionPayload({
                        streamKind: StreamKind.SK_USER,
                        streamId: bobsUserStreamId,
                    }),
                    [],
                ),
            ],
        })
        log('bobTalksToHimself Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const spaceInceptionEvent = makeEvent(
            bobsContext,
            makeInceptionPayload({
                streamKind: StreamKind.SK_SPACE,
                streamId: spacedStreamId,
            }),
            [],
        )
        await bob.createStream({
            events: [
                spaceInceptionEvent,
                makeEvent(
                    bobsContext,
                    makeJoinableStreamPayload({
                        userId: bobsUserId,
                        op: StreamOp.SO_JOIN,
                    }),
                    [spaceInceptionEvent.hash],
                ),
            ],
        })
        log('bobTalksToHimself Bob created space, about to create channel')

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelInceptionEvent = makeEvent(
            bobsContext,
            makeInceptionPayload({
                streamKind: StreamKind.SK_CHANNEL,
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            [],
        )
        const channelJoinEvent = makeEvent(
            bobsContext,
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
            [channelInceptionEvent.hash],
        )
        await bob.createStream({
            events: [channelInceptionEvent, channelJoinEvent],
        })
        log('bobTalksToHimself Bob created channel, reads it back')
        const channel = await bob.getStream({ streamId: channelId })
        expect(channel).toBeDefined()
        expect(channel.stream?.streamId).toEqual(channelId)

        // Bob starts sync on the channel
        let syncResult: SyncStreamsResponse | null = null
        log('bobTalksToHimself Bob starts sync')
        const syncPromise = bob
            .syncStreams({
                syncPos: [
                    {
                        streamId: channelId,
                        syncCookie: channel.stream?.nextSyncCookie,
                    },
                ],
                timeoutMs: 4000,
            })
            .then((result) => {
                syncResult = result
                return 'done'
            })
        expect(syncResult).toBeNull()
        // Bob succesdfully posts a message
        log('bobTalksToHimself Bob posts a message')

        const event = makeEvent(
            bobsContext,
            makeMessagePayload({
                text: 'hello',
            }),
            [channelJoinEvent.hash],
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })
        log('bobTalksToHimself Bob waits for sync to complete')

        // Bob sees the message in sync result
        await expect(syncPromise).toResolve()
        expect(syncResult).not.toBeNull()
        expect(syncResult!.streams).toHaveLength(1)
        expect(syncResult!.streams[0].events).toEqual([event])

        log("bobTalksToHimself Bob can't post event without previous event hashes")
        const badEvent = makeEvent_test(bobsContext, makeMessagePayload({ text: 'hello' }), [])
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: badEvent,
            }),
        ).rejects.toThrow()

        const badEvent1 = makeEvent_test(bobsContext, makeMessagePayload({ text: 'hello' }), [
            badEvent.hash,
        ])
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: badEvent1,
            }),
        ).rejects.toThrow()

        log('stopping client')
        log('bobTalksToHimself done')
    })

    test('aliceTalksToBob', async () => {
        log('bobAndAliceConverse start')

        const bob = makeZionRpcClient('http://localhost:5157')
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)

        const alice = makeZionRpcClient('http://localhost:5157')
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamId = makeUserStreamId(alicesUserId)

        // Create accounts for Bob and Alice
        await bob.createStream({
            events: [
                makeEvent(
                    bobsContext,
                    makeInceptionPayload({
                        streamKind: StreamKind.SK_USER,
                        streamId: bobsUserStreamId,
                    }),
                    [],
                ),
            ],
        })

        await alice.createStream({
            events: [
                makeEvent(
                    alicesContext,
                    makeInceptionPayload({
                        streamKind: StreamKind.SK_USER,
                        streamId: alicesUserStreamId,
                    }),
                    [],
                ),
            ],
        })

        // Bob creates space
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        const inceptionEvent = makeEvent(
            bobsContext,
            makeInceptionPayload({
                streamKind: StreamKind.SK_SPACE,
                streamId: spaceId,
            }),
            [],
        )
        const joinEvent = makeEvent(
            bobsContext,
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
            [inceptionEvent.hash],
        )
        await bob.createStream({
            events: [inceptionEvent, joinEvent],
        })

        // Bob creates channel
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelInceptionEvent = makeEvent(
            bobsContext,
            makeInceptionPayload({
                streamKind: StreamKind.SK_CHANNEL,
                streamId: channelId,
                spaceId: spaceId,
            }),
            [],
        )
        let event = makeEvent(
            bobsContext,
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
            [channelInceptionEvent.hash],
        )
        await bob.createStream({
            events: [channelInceptionEvent, event],
        })

        // Bob succesdfully posts a message
        event = makeEvent(
            bobsContext,
            makeMessagePayload({
                text: 'hello',
            }),
            [event.hash],
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        // Alice fails to post a message if she hasn't joined the channel
        await expect(
            alice.addEvent({
                streamId: channelId,
                event: makeEvent(
                    alicesContext,
                    makeMessagePayload({
                        text: 'hello',
                    }),
                    [event.hash],
                ),
            }),
        ).rejects.toThrow()

        // Alice syncs her user stream waiting for invite
        const userAlice = await alice.getStream({
            streamId: alicesUserStreamId,
        })
        let aliceSyncCookie = userAlice.stream?.nextSyncCookie
        let aliceSyncResult: SyncStreamsResponse | null = null
        let aliceSyncPromise = alice
            .syncStreams({
                syncPos: [
                    {
                        streamId: alicesUserStreamId,
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
        event = makeEvent(
            bobsContext,
            makeJoinableStreamPayload({
                op: StreamOp.SO_INVITE,
                userId: alicesUserId,
            }),
            [event.hash],
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        // Alice sees invite in her user stream
        await expect(aliceSyncPromise).toResolve()
        aliceSyncCookie = expectEvent(
            aliceSyncResult,
            alicesUserStreamId,
            'userStreamOp',
            (p: Payload_UserStreamOp) => {
                expect(p.op).toEqual(StreamOp.SO_INVITE)
                expect(p.inviterId).toEqual(bobsUserId)
                expect(p.streamId).toEqual(channelId)
            },
        )

        // Alice syncs her user stream again
        aliceSyncResult = null
        aliceSyncPromise = alice
            .syncStreams({
                syncPos: [
                    {
                        streamId: alicesUserStreamId,
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
        event = makeEvent(
            alicesContext,
            makeJoinableStreamPayload({
                op: StreamOp.SO_JOIN,
                userId: alicesUserId,
            }),
            [event.hash],
        )
        await alice.addEvent({
            streamId: channelId,
            event,
        })

        // Alice sees derived join event in her user stream
        await expect(aliceSyncPromise).toResolve()
        aliceSyncCookie = expectEvent(
            aliceSyncResult,
            alicesUserStreamId,
            'userStreamOp',
            (p: Payload_UserStreamOp) => {
                expect(p.op).toEqual(StreamOp.SO_JOIN)
                expect(p.streamId).toEqual(channelId)
            },
        )

        // Alice reads previouse messages from the channel
        const channel = await alice.getStream({ streamId: channelId })
        let messageCount = 0
        const m1 = unpackEnvelopes(channel.stream?.events!).forEach((e) => {
            const p = e.event.payload?.payload
            if (p?.case === 'message') {
                messageCount++
                expect(p.value.text).toEqual('hello')
            }
        })
        expect(messageCount).toEqual(1)

        // Alice syncs both her user stream and the channel
        aliceSyncResult = null
        aliceSyncPromise = alice
            .syncStreams({
                syncPos: [
                    {
                        streamId: alicesUserStreamId,
                        syncCookie: aliceSyncCookie,
                    },
                    {
                        streamId: channelId,
                        syncCookie: channel.stream?.nextSyncCookie,
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
        event = makeEvent(
            bobsContext,
            makeMessagePayload({
                text: 'Hello, Alice!',
            }),
            [event.hash],
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        // Alice sees the message in sync result
        await expect(aliceSyncPromise).toResolve()
        aliceSyncCookie = expectEvent(
            aliceSyncResult,
            channelId,
            'message',
            (p: Payload_Message) => {
                expect(p.text).toEqual('Hello, Alice!')
            },
        )
    })

    // TODO: harden stream creation and enable this test
    test.skip('errorCodeTransmitted', async () => {
        const bob = makeTestRpcClient()
        await expect(
            bob.createStream({
                events: [
                    makeEvent(
                        bobsContext,
                        makeInceptionPayload({
                            streamKind: StreamKind.SK_USER,
                            streamId: 'foo',
                        }),
                        [],
                    ),
                ],
            }),
        ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_STREAM_ID }))

        await expect(
            bob.createStream({
                events: [],
            }),
        ).rejects.toThrow(expect.objectContaining({ code: Err.BAD_STREAM_CREATION_PARAMS }))
    })

    test('cantAddWithBadHash', async () => {
        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        await expect(
            bob.createStream({
                events: [
                    makeEvent(
                        bobsContext,
                        makeInceptionPayload({
                            streamKind: StreamKind.SK_USER,
                            streamId: bobsUserStreamId,
                        }),
                        [],
                    ),
                ],
            }),
        ).toResolve()
        log('Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const spaceEvents = makeEvents(bobsContext, [
            makeInceptionPayload({
                streamKind: StreamKind.SK_SPACE,
                streamId: spacedStreamId,
            }),
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
        ])
        await bob.createStream({
            events: spaceEvents,
        })
        log('Bob created space, about to create channel')

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelEvents = makeEvents(bobsContext, [
            makeInceptionPayload({
                streamKind: StreamKind.SK_CHANNEL,
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
        ])
        await bob.createStream({
            events: channelEvents,
        })
        log('Bob created channel')

        log('Bob fails to create channel with badly chained initial events, hash empty')
        const channelId2 = makeChannelStreamId('bobs-channel2-' + genId())
        const channelEvent2_0 = makeEvent(
            bobsContext,
            makeInceptionPayload({
                streamKind: StreamKind.SK_CHANNEL,
                streamId: channelId2,
                spaceId: spacedStreamId,
            }),
        )
        const channelEvent2_1 = makeEvent_test(
            bobsContext,
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
            [],
        )
        // TODO: fix up error codes: Err.BAD_PREV_EVENTS
        await expect(
            bob.createStream({
                events: [channelEvent2_0, channelEvent2_1],
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message:
                    '[unknown] rpc error: code = InvalidArgument desc = AddEvent: event has no prev events',
            }),
        )

        log('Bob fails to create channel with badly chained initial events, wrong hash value')
        const channelEvent2_2 = makeEvent(
            bobsContext,
            makeJoinableStreamPayload({
                userId: bobsUserId,
                op: StreamOp.SO_JOIN,
            }),
            [channelEvent2_1.hash],
        )
        // TODO: fix up error codes Err.BAD_PREV_EVENTS
        await expect(
            bob.createStream({
                events: [channelEvent2_0, channelEvent2_2],
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining(
                    '[unknown] rpc error: code = InvalidArgument desc = AddEvent: prev event',
                ),
            }),
        )

        log('Bob adds event with correct hash')
        const messageEvent = makeEvent(
            bobsContext,
            makeMessagePayload({
                text: 'Hello, World!',
            }),
            _.last(channelEvents)!.hash,
        )
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: messageEvent,
            }),
        ).toResolve()

        log('Bob fails to add event with empty hash')
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: makeEvent_test(
                    bobsContext,
                    makeMessagePayload({
                        text: 'Hello, World!',
                    }),
                    [],
                ),
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message:
                    '[unknown] rpc error: code = InvalidArgument desc = AddEvent: event has no prev events',
            }),
        )

        log('Bob fails to add event with wrong hash')
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: makeEvent(
                    bobsContext,
                    makeMessagePayload({
                        text: 'Hello, World!',
                    }),
                    [channelEvent2_0.hash],
                ),
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining(
                    '[unknown] rpc error: code = InvalidArgument desc = AddEvent: prev event',
                ),
            }),
        )
    })
})

const expectEvent = (
    resp: SyncStreamsResponse | null | undefined,
    streamId: string,
    payloadType: PayloadCaseType,
    validator: (payload: any) => void,
): Uint8Array => {
    expect(resp).toBeDefined()
    resp = resp!
    expect(resp.streams).toHaveLength(1)
    expect(resp.streams[0].streamId).toEqual(streamId)
    expect(resp.streams[0].events).toHaveLength(1)

    const e = unpackEnvelope(resp.streams[0].events[0]).event
    expect(e.payload?.payload.case).toEqual(payloadType)
    validator(e.payload?.payload.value)

    expect(resp.streams[0].nextSyncCookie).toBeDefined()
    return resp.streams[0].nextSyncCookie!
}
