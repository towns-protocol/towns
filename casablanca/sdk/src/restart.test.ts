/**
 * @group restart
 */

import { MembershipOp, StreamSettings } from '@river/proto'
import { setTimeout } from 'timers/promises'
import { dlog } from '@river/waterproof'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { makeEvent, SignerContext, unpackStream, unpackStreamEnvelopes } from './sign'
import {
    getChannelPayload,
    getMessagePayload,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
    make_fake_encryptedData,
} from './types'
import {
    TEST_ENCRYPTED_MESSAGE_PROPS,
    lastEventFiltered,
    makeRandomUserContext,
    makeTestRpcClient,
} from './util.test'

const log = dlog('csb:test:nodeRestart')

describe('nodeRestart', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    // TODO: HNT-2611 fix and re-enable
    test('bobCanChatAfterRestart', async () => {
        log('start')

        const bob = makeTestRpcClient()

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

        const { channelId } = await createNewChannelAndPostHello(
            bobsContext,
            spacedStreamId,
            bobsUserId,
            bob,
        )

        log('Restarting node')
        await expect(bob.info({ debug: ['exit'] })).toResolve()

        log('Waiting a bit')
        await setTimeout(1000)

        for (;;) {
            log('Trying to connect')
            try {
                await bob.info({})
                break
            } catch (e) {
                log('Failed to connect, retrying', 'error=', e)
                await setTimeout(100)
            }
        }
        log('Connected again, node restarted')

        log('Reading back the channel, looking for hello')
        await expect(getStreamAndExpectHello(bob, channelId)).toResolve()

        log('Creating another channel, post hello')
        const { channelId: channelId2 } = await createNewChannelAndPostHello(
            bobsContext,
            spacedStreamId,
            bobsUserId,
            bob,
        )
        await expect(getStreamAndExpectHello(bob, channelId2)).toResolve()

        await countStreamBlocksAndSnapshots(bob, bobsUserStreamId)
        await countStreamBlocksAndSnapshots(bob, spacedStreamId)
        await countStreamBlocksAndSnapshots(bob, channelId)
        await countStreamBlocksAndSnapshots(bob, channelId2)

        log('done')
    })
})

const createNewChannelAndPostHello = async (
    bobsContext: SignerContext,
    spacedStreamId: string,
    bobsUserId: string,
    bob: StreamRpcClientType,
) => {
    const channelId = makeChannelStreamId('bobs-channel-' + genId())
    const channelProperties = 'Bobs channel properties'

    const channelInceptionEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Inception({
            streamId: channelId,
            spaceId: spacedStreamId,
            channelProperties: make_fake_encryptedData(channelProperties),
            settings: new StreamSettings({
                minEventsPerSnapshot: 100,
            }),
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
    let nextHash = channel.stream?.miniblocks.at(-1)?.header?.hash
    expect(nextHash).toBeDefined()

    // Now there must be "channel created" event in the space stream.
    const spaceResponse = await bob.getStream({ streamId: spacedStreamId })
    const channelCreatePayload = lastEventFiltered(
        await unpackStreamEnvelopes(spaceResponse.stream!),
        getChannelPayload,
    )
    expect(channelCreatePayload).toBeDefined()
    expect(channelCreatePayload?.channelId).toEqual(channelId)
    expect(channelCreatePayload?.channelProperties?.ciphertext).toEqual(channelProperties)

    // Post 1000 hellos to the channel
    for (let i = 0; i < 1000; i++) {
        const e = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: `hello ${i}`,
            }),
            nextHash,
        )
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: e,
            }),
        ).toResolve()
        nextHash = (await bob.getLastMiniblockHash({ streamId: channelId })).hash
    }

    // Post just hello to the channel
    const helloEvent = await makeEvent(
        bobsContext,
        make_ChannelPayload_Message({
            ...TEST_ENCRYPTED_MESSAGE_PROPS,
            ciphertext: 'hello',
        }),
        nextHash,
    )
    const lastHash = (await bob.getLastMiniblockHash({ streamId: channelId })).hash
    await expect(
        bob.addEvent({
            streamId: channelId,
            event: helloEvent,
        }),
    ).toResolve()

    return { channelId, lastHash }
}

const getStreamAndExpectHello = async (bob: StreamRpcClientType, channelId: string) => {
    const channel2 = await bob.getStream({ streamId: channelId })
    expect(channel2).toBeDefined()
    expect(channel2.stream).toBeDefined()
    expect(channel2.stream?.nextSyncCookie?.streamId).toEqual(channelId)

    const hello = lastEventFiltered(
        await unpackStreamEnvelopes(channel2.stream!),
        getMessagePayload,
    )
    expect(hello).toBeDefined()
    expect(hello?.ciphertext).toEqual('hello')
}

const countStreamBlocksAndSnapshots = async (bob: StreamRpcClientType, streamId: string) => {
    const response = await bob.getStream({ streamId: streamId })
    expect(response).toBeDefined()
    expect(response.stream).toBeDefined()
    expect(response.stream?.nextSyncCookie?.streamId).toEqual(streamId)
    const stream = await unpackStream(response.stream)
    const minipoolEventNum = stream.streamAndCookie.events.length
    let totalEvents = minipoolEventNum
    const miniblocks = stream.streamAndCookie.miniblocks.length
    let snapshots = 0
    for (const mb of stream.streamAndCookie.miniblocks) {
        expect(mb.header).toBeDefined()
        totalEvents += mb.events.length
        if (mb.header?.snapshot !== undefined) {
            snapshots++
        }
    }
    log(
        'Counted snapshots',
        'streamId=',
        streamId,
        'miniblocks=',
        miniblocks,
        'snapshots=',
        snapshots,
        'minipoolEventNum=',
        minipoolEventNum,
        'totalEvents=',
        totalEvents,
    )
    return { miniblocks, snapshots, minipoolEventNum, totalEvents }
}
