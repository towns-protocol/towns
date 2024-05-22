/**
 * @group main
 */

import { makeTestClient, createEventDecryptedPromise, waitFor } from './util.test'
import { Client } from './client'
import { addressFromUserId, makeDMStreamId, streamIdAsBytes } from './id'
import { makeEvent } from './sign'
import { make_DMChannelPayload_Inception, make_MemberPayload_Membership2 } from './types'
import { MembershipOp } from '@river-build/proto'

describe('dmsTests', () => {
    let clients: Client[] = []
    const makeInitAndStartClient = async () => {
        const client = await makeTestClient()
        await client.initializeUser()
        client.startSync()
        clients.push(client)
        return client
    }

    beforeEach(async () => {})

    afterEach(async () => {
        for (const client of clients) {
            await client.stop()
        }
        clients = []
    })

    test('clientCanCreateDM', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        expect(stream.view.getMembers().membership.joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )
    })

    test('clientsAreJoinedAutomaticallyAndCanLeaveDM', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        await waitFor(() => {
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                new Set([bobsClient.userId, alicesClient.userId]),
            )
        })

        await expect(alicesClient.leaveStream(streamId)).toResolve()
        await waitFor(
            () => {
                expect(stream.view.getMembers().membership.joinedUsers).toEqual(
                    new Set([bobsClient.userId]),
                )
            },
            { timeoutMS: 15000 },
        )
    })

    test('clientsCanSendMessages', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(bobsClient.sendMessage(streamId, 'hello')).toResolve()

        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello')).toResolve()
    })

    test('otherUsersCantJoinDM', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const charliesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(
            charliesClient.joinStream(streamId, { skipWaitForMiniblockConfirmation: true }),
        ).toReject()
    })

    test('otherUsersCantSendMessages', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const charliesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(
            charliesClient.joinStream(streamId, { skipWaitForMiniblockConfirmation: true }),
        ).toReject()
        await expect(charliesClient.sendMessage(streamId, 'hello')).toReject()
    })

    test('usersCantInviteOtherUsers', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const charliesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.inviteUser(streamId, charliesClient.userId)).toReject()
    })

    test('creatingDMChannelTwiceReturnsStreamId', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        // stop syncing and remove stream from cache
        await bobsClient.streams.removeStreamFromSync(streamId)
        const { streamId: streamId2 } = await bobsClient.createDMChannel(alicesClient.userId)
        expect(streamId).toEqual(streamId2)
    })

    test('usersReceiveKeys', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()

        const aliceEventDecryptedPromise = createEventDecryptedPromise(
            alicesClient,
            'hello this is bob',
        )
        const bobEventDecryptedPromise = createEventDecryptedPromise(
            bobsClient,
            'hello bob, this is alice',
        )

        await expect(bobsClient.sendMessage(streamId, 'hello this is bob')).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello bob, this is alice')).toResolve()

        await expect(
            Promise.all([aliceEventDecryptedPromise, bobEventDecryptedPromise]),
        ).toResolve()
    })

    test('clientCanCreateSingleParticipantDM', async () => {
        const bobsClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(bobsClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        expect(stream.view.getMembers().membership.joinedUsers).toEqual(
            new Set([bobsClient.userId]),
        )
    })

    // Alice should not be allowed to create a 1:1 DM between Bob and himself.
    test('clientCannotCreateSingleParticipantDMForOtherUser', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const channelIdStr = makeDMStreamId(bobsClient.userId, bobsClient.userId)
        const channelId = streamIdAsBytes(channelIdStr)
        const inceptionEvent = await makeEvent(
            alicesClient.signerContext,
            make_DMChannelPayload_Inception({
                streamId: channelId,
                firstPartyAddress: bobsClient.signerContext.creatorAddress,
                secondPartyAddress: addressFromUserId(bobsClient.userId),
            }),
        )

        const joinEvent = await makeEvent(
            alicesClient.signerContext,
            make_MemberPayload_Membership2({
                userId: bobsClient.userId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsClient.userId,
            }),
        )

        const inviteEvent = await makeEvent(
            alicesClient.signerContext,
            make_MemberPayload_Membership2({
                userId: bobsClient.userId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsClient.userId,
            }),
        )

        await expect(
            alicesClient.rpcClient.createStream({
                events: [inceptionEvent, joinEvent, inviteEvent],
                streamId: channelId,
            }),
        ).rejects.toThrow(new RegExp('creator must be first party for dm channel'))
    })
})
