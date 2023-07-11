import { makeEvent, SignerContext, unpackEnvelopes } from './sign'
import { MembershipOp, SyncStreamsResponse, Envelope } from '@towns/proto'
import { DLogger } from './dlog'
import { makeEvent_test, makeTestRpcClient, sendFlush } from './util.test'
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
    const channelName = 'Bobs channel'
    const channelTopic = 'Bobs channel topic'

    const channelInceptionEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Inception({
            streamId: channelId,
            spaceId: spacedStreamId,
            channelName: channelName,
            channelTopic: channelTopic,
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
    expect(channelCreatePayload?.channelName).toEqual(channelName)
    expect(channelCreatePayload?.channelTopic).toEqual(channelTopic)

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
}
