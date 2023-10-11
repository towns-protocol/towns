import { makeEvent, SignerContext, unpackEnvelopes } from './sign'
import { MembershipOp, SyncStreamsResponse, Envelope } from '@river/proto'
import { DLogger } from './dlog'
import { lastEventFiltered, makeEvent_test, makeTestRpcClient, sendFlush } from './util.test'
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
            channelProperties: { text: channelProperties },
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
    const channelCreatePayload = lastEventFiltered(
        unpackEnvelopes(spaceResponse.stream!.events),
        getChannelPayload,
    )
    expect(channelCreatePayload).toBeDefined()
    expect(channelCreatePayload?.channelId).toEqual(channelId)
    expect(channelCreatePayload?.channelProperties?.text).toEqual(channelProperties)

    await maybeFlush()

    let presyncEvent: Envelope | undefined = undefined
    if (presync) {
        log('adding event before sync, so it should be the first event in the sync stream')
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
    let syncResultPromise = bobSyncStream.next()

    if (flush || presync) {
        log('Flush or presync, wait for sync to return initial events')
        const syncResultI = await syncResultPromise

        const syncResult = syncResultI.value as SyncStreamsResponse
        expect(syncResult).toBeDefined()
        expect(syncResult.streams).toHaveLength(1)
        expect(syncResult.streams[0].nextSyncCookie?.streamId).toEqual(channelId)

        // If we flushed, the sync cookie instance is different,
        // and first two events in the channel are returned immediately.
        // If presync event is posted as well, it is returned as well.
        if (flush) {
            expect(syncResult.streams[0].startSyncCookie?.minipoolGen).not.toEqual(
                syncCookie.minipoolGen,
            )

            expect(syncResult.streams[0].events).toEqual(
                presync ? [...channelEvents, presyncEvent] : channelEvents,
            )
        } else {
            expect(syncResult.streams[0].startSyncCookie).toEqual(syncCookie)
            expect(syncResult.streams[0].events).toEqual([presyncEvent])
        }

        syncCookie = syncResult.streams[0].nextSyncCookie!
        syncResultPromise = bobSyncStream.next()
    }

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

    const [syncResultI] = await Promise.all([syncResultPromise, addEventPromise])
    log('Bob waits for sync to complete')

    const syncResult = syncResultI.value as SyncStreamsResponse
    expect(syncResult).toBeDefined()
    expect(syncResult.streams).toHaveLength(1)
    expect(syncResult.streams[0].nextSyncCookie?.streamId).toEqual(channelId)
    expect(syncResult.streams[0].startSyncCookie).toEqual(syncCookie)
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

    // TODO: HNT-1843: Re-enable block-aware event duplicate checks
    // await maybeFlush()
    // const badEvent1 = await makeEvent_test(
    //     bobsContext,
    //     make_ChannelPayload_Message({ text: 'hello' }),
    //     [badEvent.hash],
    // )
    // await expect(
    //     bob.addEvent({
    //         streamId: channelId,
    //         event: badEvent1,
    //     }),
    // ).rejects.toThrow()

    log('done')
}
