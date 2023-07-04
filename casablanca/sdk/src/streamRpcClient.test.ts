import { makeEvent, makeEvents, SignerContext, unpackEnvelope, unpackEnvelopes } from './sign'
import {
    Err,
    PayloadCaseType,
    MembershipOp,
    SyncStreamsResponse,
    UserPayload_UserMembership,
    ChannelPayload_Message,
    SyncCookie,
    Envelope,
} from '@towns/proto'
import { dlog } from './dlog'
import {
    makeEvent_test,
    makeRandomUserContext,
    makeRandomUserContextWithOldDelegate,
    sendFlush,
    TEST_URL,
} from './util.test'
import _ from 'lodash'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import {
    getChannelPayload,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
} from './types'
import { makeStreamRpcClient } from './makeStreamRpcClient'

const log = dlog('csb:test:streamRpcClient')
const baseLog = log

const makeTestRpcClient = () => makeStreamRpcClient(TEST_URL)

describe('streamRpcClient', () => {
    let bobsContext: SignerContext
    let alicesContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
        alicesContext = await makeRandomUserContext()
    })

    test('makeStreamRpcClient', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()
        const result = await client.info({ debug: 'graffiti' })
        expect(result).toBeDefined()
        expect(result.graffiti).toEqual('Towns.com node welcomes you!')
    })

    test('error', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()
        await expect(client.info({ debug: 'error' })).rejects.toThrow(
            '[invalid_argument] 1:DEBUG_ERROR: Error requested through Info request',
        )
    })

    test('panic', async () => {
        const client = makeTestRpcClient()
        expect(client).toBeDefined()
        await expect(client.info({ debug: 'panic' })).rejects.toThrow(
            '[unknown] TypeError: fetch failed',
        )
    })

    test('charlieUsesOldDelegate', async () => {
        const charliesContext = await makeRandomUserContextWithOldDelegate()

        const charlie = makeTestRpcClient()
        const userId = userIdFromAddress(charliesContext.creatorAddress)
        const streamId = makeUserStreamId(userId)
        await charlie.createStream({
            events: [
                await makeEvent(
                    charliesContext,
                    make_UserPayload_Inception({
                        streamId: streamId,
                    }),
                    [],
                ),
            ],
        })
    })

    test('bobSendsMismatchedPayloadCase', async () => {
        log('bobSendsMismatchedPayloadCase', 'start')
        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        const inceptionEvent = await makeEvent(
            bobsContext,
            make_UserPayload_Inception({
                streamId: bobsUserStreamId,
            }),
            [],
        )
        await bob.createStream({
            events: [inceptionEvent],
        })
        const userStream = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userStream).toBeDefined()
        expect(userStream.stream?.streamId).toEqual(bobsUserStreamId)

        // try to send a channel message
        const event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                text: 'hello',
            }),
            [inceptionEvent.hash],
        )
        const promise = bob.addEvent({
            streamId: bobsUserStreamId,
            event,
        })

        await expect(promise).rejects.toThrow(
            'inception type mismatch: *protocol.StreamEvent_ChannelPayload::*protocol.ChannelPayload_Message_ vs *protocol.UserPayload_Inception',
        )

        log('bobSendsMismatchedPayloadCase', 'done')
    })

    // TODO: flush tests neeed to be run separately:
    // Jest runs multiple tests in parallel, and flushes are global.
    // 1) client.ts doesn't support it still (upcoming).
    // 2) while all code should survive this, it makes tests non-deterministic.
    test.each([
        ['noflush-nopresync', false, false],
        ['noflush-presync', false, true],
        // ['flush-nopresync', true, false],
        // ['flush-presync', true, true],
    ])('bobTalksToHimself-%s', async (name: string, flush: boolean, presync: boolean) => {
        const log = baseLog.extend(`bobTalksToHimself-${name}`)
        log('start')

        const bob = makeTestRpcClient()

        const maybeFlush = flush
            ? async () => {
                  await sendFlush(bob)
                  log('flushed')
              }
            : async () => {}

        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        await bob.createStream({
            events: [
                await makeEvent(
                    bobsContext,
                    make_UserPayload_Inception({
                        streamId: bobsUserStreamId,
                    }),
                    [],
                ),
            ],
        })
        await maybeFlush()
        log('Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const spaceInceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            [],
        )
        await bob.createStream({
            events: [
                spaceInceptionEvent,
                await makeEvent(
                    bobsContext,
                    make_SpacePayload_Membership({
                        userId: bobsUserId,
                        op: MembershipOp.SO_JOIN,
                    }),
                    [spaceInceptionEvent.hash],
                ),
            ],
        })
        await maybeFlush()

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            [],
        )
        const channelJoinEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
            [channelInceptionEvent.hash],
        )
        let nextHash = channelJoinEvent.hash
        const channelEvents = [channelInceptionEvent, channelJoinEvent]
        log('creating channel with events=', channelEvents)
        await bob.createStream({
            events: channelEvents,
        })
        log('Bob created channel, reads it back')
        const channel = await bob.getStream({ streamId: channelId })
        expect(channel).toBeDefined()
        expect(channel.stream).toBeDefined()
        expect(channel.stream?.streamId).toEqual(channelId)
        await maybeFlush()

        // Now there must be "channel created" event in the space stream.
        const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
        const channelCreatePayload = getChannelPayload(
            _.last(unpackEnvelopes(spaceResponse.stream!.events)),
        )
        expect(channelCreatePayload).toBeDefined()
        expect(channelCreatePayload?.channelId).toEqual(channelId)
        await maybeFlush()

        let presyncEvent: Envelope | undefined = undefined
        if (presync) {
            log('adding event before sync, so it shoudl be first in the sync stream')
            presyncEvent = await makeEvent(
                bobsContext,
                make_ChannelPayload_Message({
                    text: 'presync',
                }),
                [nextHash],
            )
            nextHash = presyncEvent.hash
            await bob.addEvent({
                streamId: channelId,
                event: presyncEvent,
            })
            await maybeFlush()
        }

        log('Bob starts sync with sync cookie=', channel.stream?.nextSyncCookie)
        const abortController = new AbortController()

        let syncCookie = channel.stream!.nextSyncCookie!
        const bobSyncStreamIterable: AsyncIterable<SyncStreamsResponse> = bob.syncStreams(
            {
                syncPos: [syncCookie],
            },
            {
                signal: abortController.signal,
            },
        )
        const bobSyncStream = bobSyncStreamIterable[Symbol.asyncIterator]()
        // Next bit is tricky. Iterator needs to be started before AddEvent
        // for sync to hit the wire.
        const syncResultPromise = bobSyncStream.next()

        // Bob succesdfully posts a message
        log('Bob posts a message')

        await maybeFlush()
        const helloEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                text: 'hello',
            }),
            [nextHash],
        )
        nextHash = helloEvent.hash
        const addEventPromise = bob.addEvent({
            streamId: channelId,
            event: helloEvent,
        })

        let [syncResultI] = await Promise.all([syncResultPromise, addEventPromise])
        log('Bob waits for sync to complete')

        if (flush || presync) {
            // Since we flushed, the sync cookie instance is different,
            // and first two events in the channel are returned immediately.
            // If presync event is posted as well, it is returned as well.
            const syncResult = syncResultI.value as SyncStreamsResponse
            expect(syncResult).toBeDefined()
            expect(syncResult.streams).toHaveLength(1)
            expect(syncResult.streams[0].streamId).toEqual(channelId)

            if (flush) {
                expect(syncResult.streams[0].originalSyncCookie?.minipoolInstance).not.toEqual(
                    syncCookie.minipoolInstance,
                )

                expect(syncResult.streams[0].events).toEqual(
                    presync ? [...channelEvents, presyncEvent] : channelEvents,
                )
            } else {
                expect(syncResult.streams[0].originalSyncCookie).toEqual(syncCookie)
                expect(syncResult.streams[0].events).toEqual([presyncEvent])
            }

            syncCookie = syncResult.streams[0].nextSyncCookie!
            syncResultI = await bobSyncStream.next()
        }

        const syncResult = syncResultI.value as SyncStreamsResponse
        expect(syncResult).toBeDefined()
        expect(syncResult.streams).toHaveLength(1)
        expect(syncResult.streams[0].streamId).toEqual(channelId)
        expect(syncResult.streams[0].originalSyncCookie).toEqual(syncCookie)
        expect(syncResult.streams[0].events).toEqual([helloEvent])

        log('stopping sync')
        abortController.abort()
        await expect(bobSyncStream.next()).toReject()

        log("Bob can't post event without previous event hashes")
        await maybeFlush()
        const badEvent = await makeEvent_test(
            bobsContext,
            make_ChannelPayload_Message({
                text: 'hello',
            }),
            [],
        )
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: badEvent,
            }),
        ).rejects.toThrow()

        await maybeFlush()
        const badEvent1 = await makeEvent_test(
            bobsContext,
            make_ChannelPayload_Message({ text: 'hello' }),
            [badEvent.hash],
        )
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: badEvent1,
            }),
        ).rejects.toThrow()

        log('done')
    })

    test('aliceTalksToBob', async () => {
        log('bobAndAliceConverse start')

        const bob = makeStreamRpcClient('http://localhost:5157')
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)

        const alice = makeStreamRpcClient('http://localhost:5157')
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamId = makeUserStreamId(alicesUserId)

        // Create accounts for Bob and Alice
        await bob.createStream({
            events: [
                await makeEvent(
                    bobsContext,
                    make_UserPayload_Inception({
                        streamId: bobsUserStreamId,
                    }),
                    [],
                ),
            ],
        })

        await alice.createStream({
            events: [
                await makeEvent(
                    alicesContext,
                    make_UserPayload_Inception({
                        streamId: alicesUserStreamId,
                    }),
                    [],
                ),
            ],
        })

        // Bob creates space
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        const inceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spaceId,
            }),
            [],
        )
        const joinEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
            [inceptionEvent.hash],
        )
        await bob.createStream({
            events: [inceptionEvent, joinEvent],
        })

        // Bob creates channel
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spaceId,
            }),
            [],
        )
        let event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
            [channelInceptionEvent.hash],
        )
        await bob.createStream({
            events: [channelInceptionEvent, event],
        })

        // Bob succesdfully posts a message
        event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
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
                event: await makeEvent(
                    alicesContext,
                    make_ChannelPayload_Message({
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
        if (!userAlice.stream) throw new Error('userAlice stream not found')
        let aliceSyncCookie = userAlice.stream.nextSyncCookie
        const aliceAbortController = new AbortController()
        const aliceSyncStreams = alice.syncStreams(
            {
                syncPos: [aliceSyncCookie!],
            },
            {
                signal: aliceAbortController.signal,
            },
        )

        // Bob invites Alice to the channel
        event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                op: MembershipOp.SO_INVITE,
                userId: alicesUserId,
            }),
            [event.hash],
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        const aliceSyncResult = await (async () => {
            for await (const result of aliceSyncStreams) {
                return result
            }
            return undefined
        })()

        expect(aliceSyncResult).toBeDefined()

        aliceAbortController.abort()

        aliceSyncCookie = expectEvent(
            aliceSyncResult,
            alicesUserStreamId,
            'userPayload',
            (p: UserPayload_UserMembership) => {
                expect(p.op).toEqual(MembershipOp.SO_INVITE)
                expect(p.inviterId).toEqual(bobsUserId)
                expect(p.streamId).toEqual(channelId)
            },
        )

        const aliceAbortControllerUserStream = new AbortController()

        // Alice syncs her user stream again
        const userSyncStream = alice.syncStreams(
            {
                syncPos: [aliceSyncCookie],
            },
            {
                signal: aliceAbortControllerUserStream.signal,
            },
        )

        // Alice joins the channel
        event = await makeEvent(
            alicesContext,
            make_ChannelPayload_Membership({
                op: MembershipOp.SO_JOIN,
                userId: alicesUserId,
            }),
            [event.hash],
        )
        await alice.addEvent({
            streamId: channelId,
            event,
        })

        const aliceSyncResultUserStream = await (async () => {
            for await (const result of userSyncStream) {
                return result
            }
            return undefined
        })()

        expect(aliceSyncResultUserStream).toBeDefined()

        aliceAbortControllerUserStream.abort()

        // Alice sees derived join event in her user stream
        aliceSyncCookie = expectEvent(
            aliceSyncResultUserStream,
            alicesUserStreamId,
            'userPayload',
            (p: UserPayload_UserMembership) => {
                expect(p.op).toEqual(MembershipOp.SO_JOIN)
                expect(p.streamId).toEqual(channelId)
            },
        )

        // Alice reads previouse messages from the channel
        const channel = await alice.getStream({ streamId: channelId })
        let messageCount = 0
        if (!channel.stream) throw new Error('channel stream not found')
        unpackEnvelopes(channel.stream.events).forEach((e) => {
            const p = e.event.payload
            if (p?.case === 'channelPayload' && p.value.content.case === 'message') {
                messageCount++
                expect(p.value.content.value.text).toEqual('hello')
            }
        })
        expect(messageCount).toEqual(1)

        const aliceAbortControllerMultipleStreams = new AbortController()

        const userAndChannelStreamSync = alice.syncStreams(
            {
                syncPos: [aliceSyncCookie, channel.stream.nextSyncCookie!],
            },
            {
                signal: aliceAbortControllerMultipleStreams.signal,
            },
        )

        // Bob posts another message
        event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                text: 'Hello, Alice!',
            }),
            [event.hash],
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        const aliceSyncResultMultipleStreams = await (async () => {
            // Alice sees the message in sync result
            for await (const stream of userAndChannelStreamSync) {
                return stream
            }
            return undefined
        })()

        aliceAbortControllerMultipleStreams.abort()

        expect(aliceSyncResultMultipleStreams).toBeDefined()

        aliceSyncCookie = expectEvent(
            aliceSyncResultMultipleStreams,
            channelId,
            'channelPayload',
            (p: ChannelPayload_Message) => {
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
                    await makeEvent(
                        bobsContext,
                        make_UserPayload_Inception({
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
                    await makeEvent(
                        bobsContext,
                        make_UserPayload_Inception({
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
        const spaceEvents = await makeEvents(bobsContext, [
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            make_SpacePayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
        ])
        await bob.createStream({
            events: spaceEvents,
        })
        log('Bob created space, about to create channel')

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelEvents = await makeEvents(bobsContext, [
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
        ])
        await bob.createStream({
            events: channelEvents,
        })
        log('Bob created channel')

        log('Bob fails to create channel with badly chained initial events, hash empty')
        const channelId2 = makeChannelStreamId('bobs-channel2-' + genId())
        const channelEvent2_0 = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId2,
                spaceId: spacedStreamId,
            }),
        )
        const channelEvent2_1 = await makeEvent_test(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
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
                    '[invalid_argument] 3:BAD_STREAM_CREATION_PARAMS: CreateStream: bad hash on event index: 1',
            }),
        )

        log('Bob fails to create channel with badly chained initial events, wrong hash value')
        const channelEvent2_2 = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
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
                    '[invalid_argument] 3:BAD_STREAM_CREATION_PARAMS: CreateStream: bad hash on event index: 1',
                ),
            }),
        )

        log('Bob adds event with correct hash')
        const messageEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
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
                event: await makeEvent_test(
                    bobsContext,
                    make_ChannelPayload_Message({
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
                event: await makeEvent(
                    bobsContext,
                    make_ChannelPayload_Message({
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

    test('cantAddWithBadSignature', async () => {
        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
        await expect(
            bob.createStream({
                events: [
                    await makeEvent(
                        bobsContext,
                        make_UserPayload_Inception({
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
        const spaceEvents = await makeEvents(bobsContext, [
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            make_SpacePayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
        ])
        await bob.createStream({
            events: spaceEvents,
        })
        log('Bob created space, about to create channel')

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelEvents = await makeEvents(bobsContext, [
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
            }),
        ])
        await bob.createStream({
            events: channelEvents,
        })
        log('Bob created channel')

        log('Bob adds event with correct signature')
        const messageEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                text: 'Hello, World!',
            }),
            _.last(channelEvents)!.hash,
        )
        channelEvents.push(messageEvent)
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: messageEvent,
            }),
        ).toResolve()

        log('Bob failes to add event with bad signature')
        const badEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                text: 'Nah, not really',
            }),
            _.last(channelEvents)!.hash,
        )
        badEvent.signature = messageEvent.signature
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: badEvent,
            }),
        ).rejects.toThrow(/^\[invalid_argument\] 7:BAD_EVENT_SIGNATURE:.*$/)
    })
})

const expectEvent = (
    resp: SyncStreamsResponse | null | undefined,
    streamId: string,
    streamKind: PayloadCaseType,
    validator: (payload: any) => void,
): SyncCookie => {
    expect(resp).toBeDefined()
    resp = resp!
    expect(resp.streams).toHaveLength(1)
    expect(resp.streams[0].streamId).toEqual(streamId)
    expect(resp.streams[0].events).toHaveLength(1)

    const e = unpackEnvelope(resp.streams[0].events[0]).event
    expect(e.payload?.case).toEqual(streamKind)
    validator(e.payload?.value?.content.value)

    expect(resp.streams[0].nextSyncCookie).toBeDefined()
    return resp.streams[0].nextSyncCookie!
}
