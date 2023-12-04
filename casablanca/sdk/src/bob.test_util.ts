import { makeEvent, SignerContext, unpackEnvelopes, unpackStreamResponse } from './sign'
import { MembershipOp, SyncStreamsResponse, Envelope } from '@river/proto'
import { DLogger } from './dlog'
import {
    lastEventFiltered,
    makeEvent_test,
    makeTestRpcClient,
    sendFlush,
    TEST_ENCRYPTED_MESSAGE_PROPS,
} from './util.test'
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

export const bobTalksToHimself = async (
    log: DLogger,
    bobsContext: SignerContext,
    flush: boolean,
    presync: boolean,
) => {
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
            ),
        ],
        streamId: bobsUserStreamId,
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
            ),
        ],
        streamId: spacedStreamId,
    })
    await maybeFlush()

    const channelId = makeChannelStreamId('bobs-channel-' + genId())
    const channelProperties = 'Bobs channel properties'

    const channelInceptionEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Inception({
            streamId: channelId,
            spaceId: spacedStreamId,
            channelProperties: { ...TEST_ENCRYPTED_MESSAGE_PROPS, ciphertext: channelProperties },
        }),
    )
    const channelJoinEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Membership({
            userId: bobsUserId,
            op: MembershipOp.SO_JOIN,
        }),
    )
    const channelEvents = [channelInceptionEvent, channelJoinEvent]
    log('creating channel with events=', channelEvents)
    await bob.createStream({
        events: channelEvents,
        streamId: channelId,
    })
    log('Bob created channel, reads it back')
    const channel = await bob.getStream({ streamId: channelId })
    expect(channel).toBeDefined()
    expect(channel.stream).toBeDefined()
    expect(channel.stream?.nextSyncCookie?.streamId).toEqual(channelId)
    await maybeFlush()

    // Now there must be "channel created" event in the space stream.
    const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
    const envelopes = [
        ...unpackStreamResponse(spaceResponse).miniblocks.flatMap((x) => x.events),
        ...unpackEnvelopes(spaceResponse.stream!.events),
    ]
    const channelCreatePayload = lastEventFiltered(envelopes, getChannelPayload)
    expect(channelCreatePayload).toBeDefined()
    expect(channelCreatePayload?.channelId).toEqual(channelId)
    expect(channelCreatePayload?.channelProperties?.ciphertext).toEqual(channelProperties)

    await maybeFlush()

    let presyncEvent: Envelope | undefined = undefined
    if (presync) {
        log('adding event before sync, so it should be the first event in the sync stream')
        presyncEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'presync',
            }),
            channel.miniblocks.at(-1)?.header?.hash,
        )
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
    let syncResultPromise = bobSyncStream.next()

    if (flush || presync) {
        log('Flush or presync, wait for sync to return initial events')
        const syncResultI = await syncResultPromise

        const syncResult = syncResultI.value as SyncStreamsResponse
        expect(syncResult).toBeDefined()
        expect(syncResult.stream).toBeDefined()
        expect(syncResult.stream?.nextSyncCookie?.streamId).toEqual(channelId)

        // If we flushed, the sync cookie instance is different,
        // and first two events in the channel are returned immediately.
        // If presync event is posted as well, it is returned as well.
        if (flush) {
            expect(syncResult.stream?.startSyncCookie?.minipoolGen).not.toEqual(
                syncCookie.minipoolGen,
            )

            expect(syncResult.stream?.events).toEqual(
                presync ? [...channelEvents, presyncEvent] : channelEvents,
            )
        } else {
            expect(syncResult.stream?.startSyncCookie).toEqual(syncCookie)
            expect(syncResult.stream?.events).toEqual([presyncEvent])
        }

        syncCookie = syncResult.stream!.nextSyncCookie!
        syncResultPromise = bobSyncStream.next()
    }

    // Bob succesdfully posts a message
    log('Bob posts a message')

    await maybeFlush()
    const hashResponse = await bob.getLastMiniblockHash({ streamId: channelId })
    const helloEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Message({
            ...TEST_ENCRYPTED_MESSAGE_PROPS,
            ciphertext: 'hello',
        }),
        hashResponse.hash,
    )
    const addEventPromise = bob.addEvent({
        streamId: channelId,
        event: helloEvent,
    })

    const [syncResultI] = await Promise.all([syncResultPromise, addEventPromise])
    log('Bob waits for sync to complete')

    const syncResult = syncResultI.value as SyncStreamsResponse
    expect(syncResult).toBeDefined()
    expect(syncResult.stream).toBeDefined()
    expect(syncResult.stream?.nextSyncCookie?.streamId).toEqual(channelId)
    expect(syncResult.stream?.startSyncCookie).toEqual(syncCookie)
    expect(syncResult.stream?.events).toEqual([helloEvent])

    log('stopping sync')
    abortController.abort()
    await expect(bobSyncStream.next()).toReject()

    log("Bob can't post event without previous event hashes")
    await maybeFlush()
    const badEvent = await makeEvent_test(
        bobsContext,
        make_ChannelPayload_Message({
            ...TEST_ENCRYPTED_MESSAGE_PROPS,
            ciphertext: 'hello',
        }),
        Uint8Array.from([1, 2, 3]),
    )
    await expect(
        bob.addEvent({
            streamId: channelId,
            event: badEvent,
        }),
    ).rejects.toThrow(
        expect.objectContaining({
            message: expect.stringContaining('24:BAD_PREV_MINIBLOCK_HASH'),
        }),
    )

    log("Bob can't add a previously added event (messages from the client contain timestamps)")
    await maybeFlush()
    await expect(
        bob.addEvent({
            streamId: channelId,
            event: helloEvent,
        }),
    ).rejects.toThrow(
        expect.objectContaining({
            message: expect.stringContaining('37:DUPLICATE_EVENT'),
        }),
    )

    log('done')
}
