import { makeEvent, unpackStreamEnvelopes } from './sign'
import { MembershipOp, SyncStreamsResponse, Envelope, SyncOp } from '@river-build/proto'
import { DLogger } from '@river-build/dlog'
import {
    lastEventFiltered,
    makeEvent_test,
    makeTestRpcClient,
    makeUniqueSpaceStreamId,
    sendFlush,
    TEST_ENCRYPTED_MESSAGE_PROPS,
    waitForSyncStreams,
    waitForSyncStreamsMessage,
} from './util.test'
import {
    makeUniqueChannelStreamId,
    makeUserStreamId,
    streamIdToBytes,
    userIdFromAddress,
} from './id'
import {
    getChannelUpdatePayload,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Message,
    make_MemberPayload_Membership2,
    make_SpacePayload_Inception,
    make_UserPayload_Inception,
} from './types'
import { SignerContext } from './signerContext'

export const bobTalksToHimself = async (
    log: DLogger,
    bobsContext: SignerContext,
    flush: boolean,
    presync: boolean,
) => {
    log('start')

    const bob = await makeTestRpcClient()

    const maybeFlush = flush
        ? async () => {
              await sendFlush(bob)
              log('flushed')
          }
        : async () => {}

    const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
    const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
    const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)
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
    const spacedStreamIdStr = makeUniqueSpaceStreamId()
    const spacedStreamId = streamIdToBytes(spacedStreamIdStr)
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
                make_MemberPayload_Membership2({
                    userId: bobsUserId,
                    op: MembershipOp.SO_JOIN,
                    initiatorId: bobsUserId,
                }),
            ),
        ],
        streamId: spacedStreamId,
    })
    await maybeFlush()

    const channelIdStr = makeUniqueChannelStreamId(spacedStreamIdStr)
    const channelId = streamIdToBytes(channelIdStr)

    const channelInceptionEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Inception({
            streamId: channelId,
            spaceId: spacedStreamId,
        }),
    )
    const channelJoinEvent = await makeEvent(
        bobsContext,
        make_MemberPayload_Membership2({
            userId: bobsUserId,
            op: MembershipOp.SO_JOIN,
            initiatorId: bobsUserId,
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
    const channelCreatePayload = lastEventFiltered(
        await unpackStreamEnvelopes(spaceResponse.stream!),
        getChannelUpdatePayload,
    )
    expect(channelCreatePayload).toBeDefined()
    expect(channelCreatePayload?.channelId).toEqual(channelId)

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
            channel.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await bob.addEvent({
            streamId: channelId,
            event: presyncEvent,
        })
        await maybeFlush()
    }

    log('Bob starts sync with sync cookie=', channel.stream?.nextSyncCookie)

    let syncCookie = channel.stream!.nextSyncCookie!
    const bobSyncStreamIterable: AsyncIterable<SyncStreamsResponse> = bob.syncStreams({
        syncPos: [syncCookie],
    })
    await expect(
        waitForSyncStreams(
            bobSyncStreamIterable,
            async (res) => res.syncOp === SyncOp.SYNC_NEW && res.syncId !== undefined,
        ),
    ).toResolve()

    if (flush || presync) {
        log('Flush or presync, wait for sync to return initial events')
        const syncResult = await waitForSyncStreamsMessage(bobSyncStreamIterable, 'presync')
        expect(syncResult?.stream).toBeDefined()
        const stream = syncResult.stream
        expect(stream).toBeDefined()
        if (!stream) {
            throw new Error('stream is undefined')
        }
        expect(stream.nextSyncCookie?.streamId).toEqual(channelId)

        // If we flushed, the sync cookie instance is different,
        // and first two events in the channel are returned immediately.
        // If presync event is posted as well, it is returned as well.
        if (flush) {
            expect(stream.events).toEqual(
                presync ? [...channelEvents, presyncEvent] : channelEvents,
            )
        } else {
            expect(stream?.events).toEqual(expect.arrayContaining([presyncEvent]))
        }

        syncCookie = stream.nextSyncCookie!
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
    await bob.addEvent({
        streamId: channelId,
        event: helloEvent,
    })

    log('Bob waits for sync to complete')
    const syncResult = await waitForSyncStreamsMessage(bobSyncStreamIterable, 'hello')
    expect(syncResult?.stream).toBeDefined()
    const stream = syncResult?.stream
    expect(stream).toBeDefined()
    expect(stream?.nextSyncCookie?.streamId).toEqual(channelId)
    expect(stream?.events).toEqual([helloEvent])

    log('stopping sync')
    await bob.cancelSync({ syncId: syncResult.syncId })

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
