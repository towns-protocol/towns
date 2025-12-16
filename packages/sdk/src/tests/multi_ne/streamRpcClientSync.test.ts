/**
 * @group main
 */

import { makeEvent } from '../../sign'
import { MembershipOp, SyncStreamsResponse, SyncOp } from '@towns-protocol/proto'
import {
    makeRandomUserContext,
    makeTestRpcClient,
    makeUniqueSpaceStreamId,
    TEST_ENCRYPTED_MESSAGE_PROPS,
    waitForSyncStreams,
} from '../testUtils'
import {
    makeUniqueChannelStreamId,
    makeUserStreamId,
    streamIdToBytes,
    userIdFromAddress,
} from '../../id'
import {
    make_ChannelPayload_Inception,
    make_ChannelPayload_Message,
    make_MemberPayload_Membership2,
    make_SpacePayload_Inception,
    make_UserPayload_Inception,
    make_UserPayload_UserMembership,
} from '../../types'
import { SignerContext } from '../../signerContext'

type SyncStreamCallback = (resp: SyncStreamsResponse) => boolean

async function readSyncStreams(
    stream: AsyncIterable<SyncStreamsResponse>,
    callback: SyncStreamCallback,
): Promise<void> {
    for await (const resp of stream) {
        if (callback(resp)) {
            // callback returns true to break from the loop
            break
        }
    }
}

describe('streamRpcClient using v2 sync', () => {
    let alicesContext: SignerContext
    let bobsContext: SignerContext

    beforeEach(async () => {
        alicesContext = await makeRandomUserContext()
        bobsContext = await makeRandomUserContext()
    })

    test('syncStreamsGetsSyncId', async () => {
        /** Arrange */
        const alice = await makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamIdStr = makeUserStreamId(alicesUserId)
        const alicesUserStreamId = streamIdToBytes(alicesUserStreamIdStr)
        // create account for alice
        await alice.createStream({
            events: [
                await makeEvent(
                    alicesContext,
                    make_UserPayload_Inception({
                        streamId: alicesUserStreamId,
                    }),
                ),
            ],
            streamId: alicesUserStreamId,
        })
        // alice creates a space
        const spaceIdStr = makeUniqueSpaceStreamId()
        const spaceId = streamIdToBytes(spaceIdStr)
        const inceptionEvent = await makeEvent(
            alicesContext,
            make_SpacePayload_Inception({
                streamId: spaceId,
            }),
        )
        const joinEvent = await makeEvent(
            alicesContext,
            make_MemberPayload_Membership2({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: alicesUserId,
            }),
        )
        await alice.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: spaceId,
        })
        // alice creates a channel
        const channelIdStr = makeUniqueChannelStreamId(spaceIdStr)
        const channelId = streamIdToBytes(channelIdStr)
        const channelInceptionEvent = await makeEvent(
            alicesContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
            }),
        )
        const event = await makeEvent(
            alicesContext,
            make_MemberPayload_Membership2({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: alicesUserId,
            }),
        )
        const alicesStream = await alice.createStream({
            events: [channelInceptionEvent, event],
            streamId: channelId,
        })

        /** Act */
        // alice calls syncStreams, and waits for the syncId in the response stream
        let syncId: string | undefined = undefined
        const syncCookie = alicesStream.stream!.nextSyncCookie!

        const aliceStreamIterable: AsyncIterable<SyncStreamsResponse> = alice.syncStreams(
            {
                syncPos: [syncCookie],
            },
            {
                timeoutMs: -1,
                headers: { 'X-Use-Shared-Sync': 'true' },
            },
        )
        await expect(
            waitForSyncStreams(aliceStreamIterable, async (res) => {
                syncId = res.syncId
                return res.syncOp === SyncOp.SYNC_NEW && res.syncId !== undefined
            }),
        ).resolves.not.toThrow()

        await alice.cancelSync({ syncId })

        /** Assert */
        expect(syncId).toBeDefined()
    })

    test('modifySyncGetsEvents', async () => {
        /** Arrange */
        const alice = await makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamIdStr = makeUserStreamId(alicesUserId)
        const alicesUserStreamId = streamIdToBytes(alicesUserStreamIdStr)
        const bob = await makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
        const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)
        // create accounts for alice and bob
        await alice.createStream({
            events: [
                await makeEvent(
                    alicesContext,
                    make_UserPayload_Inception({
                        streamId: alicesUserStreamId,
                    }),
                ),
            ],
            streamId: alicesUserStreamId,
        })
        const bobsUserStream = await bob.createStream({
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
        // alice creates a space
        const spaceIdStr = makeUniqueSpaceStreamId()
        const spaceId = streamIdToBytes(spaceIdStr)
        const inceptionEvent = await makeEvent(
            alicesContext,
            make_SpacePayload_Inception({
                streamId: spaceId,
            }),
        )
        const joinEvent = await makeEvent(
            alicesContext,
            make_MemberPayload_Membership2({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: alicesUserId,
            }),
        )
        await alice.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: spaceId,
        })
        // alice creates a channel
        const channelIdStr = makeUniqueChannelStreamId(spaceIdStr)
        const channelId = streamIdToBytes(channelIdStr)
        const channelInceptionEvent = await makeEvent(
            alicesContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
            }),
        )
        let event = await makeEvent(
            alicesContext,
            make_MemberPayload_Membership2({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: alicesUserId,
            }),
        )
        const alicesChannel = await alice.createStream({
            events: [channelInceptionEvent, event],
            streamId: channelId,
        })

        /** Act */
        // bob calls syncStreams, and waits for the syncId in the response stream
        const bobSyncStreams: AsyncIterable<SyncStreamsResponse> = bob.syncStreams(
            {
                syncPos: [],
            },
            {
                timeoutMs: -1,
                headers: { 'X-Use-Shared-Sync': 'true' },
            },
        )
        // bob reads the syncId from the response stream
        let syncId: string | undefined = undefined
        for await (const resp of bobSyncStreams) {
            if (resp.syncOp === SyncOp.SYNC_NEW) {
                syncId = resp.syncId
                break
            }
        }
        // bob joins the channel
        event = await makeEvent(
            bobsContext,
            make_UserPayload_UserMembership({
                op: MembershipOp.SO_JOIN,
                streamId: channelId,
            }),
            bobsUserStream.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await bob.addEvent({
            streamId: bobsUserStreamId,
            event,
        })
        // bob adds alice's channel to his syncStreams
        const bobsChannelStream = await bob.getStream({ streamId: channelId }, { timeoutMs: -1 })
        await bob.modifySync({
            syncId: syncId!,
            addStreams: [bobsChannelStream.stream!.nextSyncCookie!],
        })
        // alice posts a message
        event = await makeEvent(
            alicesContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'hello',
            }),
            alicesChannel.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await alice.addEvent({
            streamId: channelId,
            event,
        })
        // bob should see the message in his sync stream
        // hnt-3683 explains:
        // When AddEvent is called, node calls streamImpl.notifyToSubscribers() twice
        // first time is from addEventImpl called by AddEvent.
        // second time is from the MakeMiniBlock triggered by miniblockTick
        let messagesReceived = 0
        await readSyncStreams(bobSyncStreams, function (_: SyncStreamsResponse) {
            //log('bobSyncStreams', `resp #${++messagesReceived}`, resp)
            ++messagesReceived
            return messagesReceived === 2
        })

        /** Assert */
        expect(syncId).toBeTruthy()
        expect(messagesReceived).toEqual(2)
        await bob.cancelSync({ syncId })
    })
})
