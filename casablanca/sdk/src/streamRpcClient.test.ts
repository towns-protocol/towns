import { makeEvent, makeEvents, SignerContext, unpackEnvelopes } from './sign'
import { Err, MembershipOp, SyncStreamsResponse, SyncCookie } from '@river/proto'
import { dlog } from './dlog'
import {
    makeEvent_test,
    makeRandomUserContext,
    makeRandomUserContextWithOldDelegate,
    makeTestRpcClient,
    timeoutIterable,
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
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
    ParsedEvent,
} from './types'
import { makeStreamRpcClient } from './makeStreamRpcClient'
import { bobTalksToHimself } from './bob.test_util'

const log = dlog('csb:test:streamRpcClient')

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
            'inception type mismatch: *protocol.StreamEvent_ChannelPayload::*protocol.ChannelPayload_Message vs *protocol.UserPayload_Inception',
        )

        log('bobSendsMismatchedPayloadCase', 'done')
    })

    test.each([
        ['bobTalksToHimself-noflush-nopresync', false],
        ['bobTalksToHimself-noflush-presync', true],
    ])('%s', async (name: string, presync: boolean) => {
        await bobTalksToHimself(log.extend(name), bobsContext, false, presync)
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
                name: 'Bobs space',
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
        const channelProperties = 'Bobs channel properties'

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spaceId,
                channelProperties: { text: channelProperties },
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
                syncPos: aliceSyncCookie ? [aliceSyncCookie] : [],
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

        aliceSyncCookie = await waitForEvent(
            aliceSyncStreams,
            alicesUserStreamId,
            (e) =>
                e.event.payload?.case === 'userPayload' &&
                e.event.payload?.value.content.case === 'userMembership' &&
                e.event.payload?.value.content.value.op === MembershipOp.SO_INVITE &&
                e.event.payload?.value.content.value.streamId === channelId &&
                e.event.payload?.value.content.value.inviterId === bobsUserId,
        )

        aliceAbortController.abort()

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

        // Alice sees derived join event in her user stream
        aliceSyncCookie = await waitForEvent(
            userSyncStream,
            alicesUserStreamId,
            (e) =>
                e.event.payload?.case === 'userPayload' &&
                e.event.payload?.value.content.case === 'userMembership' &&
                e.event.payload?.value.content.value.op === MembershipOp.SO_JOIN &&
                e.event.payload?.value.content.value.streamId === channelId,
        )

        aliceAbortControllerUserStream.abort()

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

        // Alice sees the message in the channel stream
        await expect(
            waitForEvent(
                userAndChannelStreamSync,
                channelId,
                (e) =>
                    e.event.payload?.case === 'channelPayload' &&
                    e.event.payload?.value.content.case === 'message' &&
                    e.event.payload?.value.content.value.text === 'Hello, Alice!',
            ),
        ).toResolve()

        aliceAbortControllerMultipleStreams.abort()
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
                name: 'Bobs space',
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
        const channelProperties = 'Bobs channel properties'

        const channelEvents = await makeEvents(bobsContext, [
            make_ChannelPayload_Inception({
                streamId: channelId,
                channelProperties: { text: channelProperties },
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
        const channelProperties2 = 'Bobs channel properties 2'
        const channelEvent2_0 = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId2,
                spaceId: spacedStreamId,
                channelProperties: { text: channelProperties2 },
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

        // TODO: HNT-1843: Re-enable block-aware event duplicate checks
        // log('Bob fails to add event with wrong prev event hash')
        // await expect(
        //     bob.addEvent({
        //         streamId: channelId,
        //         event: await makeEvent(
        //             bobsContext,
        //             make_ChannelPayload_Message({
        //                 text: 'Hello, World!',
        //             }),
        //             [channelEvent2_0.hash],
        //         ),
        //     }),
        // ).rejects.toThrow(
        //     expect.objectContaining({
        //         message: expect.stringContaining(
        //             '[unknown] rpc error: code = InvalidArgument desc = AddEvent: prev event',
        //         ),
        //     }),
        // )
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
                name: 'Bobs space',
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
        const channelProperties = 'Bobs channel properties'

        const channelEvents = await makeEvents(bobsContext, [
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
                channelProperties: { text: channelProperties },
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

const waitForEvent = async (
    syncStream: AsyncIterable<SyncStreamsResponse>,
    streamId: string,
    matcher: (e: ParsedEvent) => boolean,
): Promise<SyncCookie> => {
    for await (const res of timeoutIterable(syncStream, 2000)) {
        for (const stream of res.streams) {
            if (stream.streamId === streamId) {
                const events = unpackEnvelopes(stream.events)
                for (const e of events) {
                    if (matcher(e)) {
                        return stream.nextSyncCookie!
                    }
                }
            }
        }
    }
    throw new Error('waitForEvent: timeout')
}
