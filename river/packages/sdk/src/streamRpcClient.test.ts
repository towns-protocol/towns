/**
 * @group main
 */

import { makeEvent, makeEvents, unpackStreamEnvelopes } from './sign'
import { MembershipOp, SyncStreamsResponse, SyncCookie, SyncOp } from '@river-build/proto'
import { bin_equal, dlog } from '@river-build/dlog'
import {
    makeEvent_test,
    makeRandomUserContext,
    makeUserContextFromWallet,
    makeTestRpcClient,
    makeUniqueSpaceStreamId,
    iterableWrapper,
    TEST_ENCRYPTED_MESSAGE_PROPS,
    waitForSyncStreams,
} from './util.test'
import {
    addressFromUserId,
    makeUniqueChannelStreamId,
    makeUserStreamId,
    streamIdAsString,
    streamIdToBytes,
    userIdFromAddress,
} from './id'
import {
    make_ChannelPayload_Inception,
    make_ChannelPayload_Message,
    make_MemberPayload_Membership2,
    make_SpacePayload_Inception,
    make_UserPayload_Inception,
    make_UserPayload_UserMembership,
    make_UserPayload_UserMembershipAction,
    ParsedEvent,
} from './types'
import { bobTalksToHimself } from './bob.test_util'
import { ethers } from 'ethers'
import { SignerContext, makeSignerContext } from './signerContext'

const log = dlog('csb:test:streamRpcClient')

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
                spaceId: spaceId,
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

        const aliceStreamIterable: AsyncIterable<SyncStreamsResponse> = alice.syncStreams({
            syncPos: [syncCookie],
        })
        await expect(
            waitForSyncStreams(aliceStreamIterable, async (res) => {
                syncId = res.syncId
                return res.syncOp === SyncOp.SYNC_NEW && res.syncId !== undefined
            }),
        ).toResolve()

        await alice.cancelSync({ syncId })

        /** Assert */
        expect(syncId).toBeDefined()
    })

    test('addStreamToSyncGetsEvents', async () => {
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
                spaceId: spaceId,
            }),
        )
        let event = await makeEvent(
            alicesContext,
            make_MemberPayload_Membership2({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: alicesUserId,
                streamParentId: spaceIdStr,
            }),
        )
        const alicesChannel = await alice.createStream({
            events: [channelInceptionEvent, event],
            streamId: channelId,
        })

        /** Act */
        // bob calls syncStreams, and waits for the syncId in the response stream
        const bobSyncStreams: AsyncIterable<SyncStreamsResponse> = bob.syncStreams({
            syncPos: [],
        })
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
                streamParentId: spaceId,
            }),
            bobsUserStream.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await bob.addEvent({
            streamId: bobsUserStreamId,
            event,
        })
        // bob adds alice's channel to his syncStreams
        const bobsChannelStream = await bob.getStream({ streamId: channelId })
        await bob.addStreamToSync({
            syncId: syncId!,
            syncPos: bobsChannelStream.stream!.nextSyncCookie!,
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

describe('streamRpcClient', () => {
    let bobsContext: SignerContext
    let alicesContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
        alicesContext = await makeRandomUserContext()
    })

    test('makeStreamRpcClient', async () => {
        const client = await makeTestRpcClient()
        log('makeStreamRpcClient', 'url', client.url)
        expect(client).toBeDefined()
        const result = await client.info({ debug: ['graffiti'] })
        expect(result).toBeDefined()
        expect(result.graffiti).toEqual('River Node welcomes you!')
    })

    test('error', async () => {
        const client = await makeTestRpcClient()
        expect(client).toBeDefined()

        let err: Error | undefined = undefined
        try {
            await client.info({ debug: ['error'] })
        } catch (e) {
            expect(e).toBeInstanceOf(Error)
            err = e as Error
        }
        log('error', err)
        expect(err).toBeDefined()
        log('error', err!.toString())
        expect(err!.toString()).toContain('Error requested through Info request')
    })

    test('error_untyped', async () => {
        const client = await makeTestRpcClient()
        expect(client).toBeDefined()

        let err: Error | undefined = undefined
        try {
            await client.info({ debug: ['error_untyped'] })
        } catch (e) {
            expect(e).toBeInstanceOf(Error)
            err = e as Error
        }
        log('error_untyped', err)
        expect(err).toBeDefined()
        log('error_untyped', err!.toString())
        expect(err!.toString()).toContain('[unknown] error requested through Info request')
    })

    test('charlieUsesRegularOldWallet', async () => {
        const wallet = ethers.Wallet.createRandom()
        const charliesContext = await makeUserContextFromWallet(wallet)

        const charlie = await makeTestRpcClient()
        const userId = userIdFromAddress(charliesContext.creatorAddress)
        const streamIdStr = makeUserStreamId(userId)
        const streamId = streamIdToBytes(streamIdStr)
        await charlie.createStream({
            events: [
                await makeEvent(
                    charliesContext,
                    make_UserPayload_Inception({
                        streamId: streamId,
                    }),
                ),
            ],
            streamId: streamId,
        })
    })

    test('bobSendsMismatchedPayloadCase', async () => {
        log('bobSendsMismatchedPayloadCase', 'start')
        const bob = await makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
        const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)
        const inceptionEvent = await makeEvent(
            bobsContext,
            make_UserPayload_Inception({
                streamId: bobsUserStreamId,
            }),
        )
        await bob.createStream({
            events: [inceptionEvent],
            streamId: bobsUserStreamId,
        })
        const userStream = await bob.getStream({ streamId: bobsUserStreamId })
        expect(userStream).toBeDefined()
        expect(userStream.stream?.nextSyncCookie?.streamId).toEqual(bobsUserStreamId)

        // try to send a channel message
        const event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'hello',
            }),
            userStream.stream?.miniblocks.at(-1)?.header?.hash,
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

        const bob = await makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
        const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)

        const alice = await makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamIdStr = makeUserStreamId(alicesUserId)
        const alicesUserStreamId = streamIdToBytes(alicesUserStreamIdStr)

        // Create accounts for Bob and Alice
        const bobsStream = await bob.createStream({
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

        const alicesStream = await alice.createStream({
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

        // Bob creates space
        const spaceIdStr = makeUniqueSpaceStreamId()
        const spaceId = streamIdToBytes(spaceIdStr)
        const inceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spaceId,
            }),
        )
        const joinEvent = await makeEvent(
            bobsContext,
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
            }),
        )
        await bob.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: spaceId,
        })

        // Bob creates channel
        const channelIdStr = makeUniqueChannelStreamId(spaceIdStr)
        const channelId = streamIdToBytes(channelIdStr)

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spaceId,
            }),
        )
        let event = await makeEvent(
            bobsContext,
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
                streamParentId: spaceIdStr,
            }),
        )
        const createChannelResponse = await bob.createStream({
            events: [channelInceptionEvent, event],
            streamId: channelId,
        })

        // Bob succesdfully posts a message
        event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'hello',
            }),
            createChannelResponse.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        // Alice fails to post a message if she hasn't joined the channel
        log("Alice fails to post a message if she hasn't joined the channel")
        await expect(
            alice.addEvent({
                streamId: channelId,
                event: await makeEvent(
                    alicesContext,
                    make_ChannelPayload_Message({
                        ...TEST_ENCRYPTED_MESSAGE_PROPS,
                        ciphertext: 'hello',
                    }),
                    createChannelResponse.stream?.miniblocks.at(-1)?.header?.hash,
                ),
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('7:PERMISSION_DENIED'),
            }),
        )

        // Alice syncs her user stream waiting for invite
        const userAlice = await alice.getStream({
            streamId: alicesUserStreamId,
        })
        if (!userAlice.stream) throw new Error('userAlice stream not found')
        let aliceSyncCookie = userAlice.stream.nextSyncCookie
        const aliceSyncStreams = alice.syncStreams({
            syncPos: aliceSyncCookie ? [aliceSyncCookie] : [],
        })

        let syncId

        log("Alice waits for Bob's channel creation event")
        await expect(
            waitForSyncStreams(aliceSyncStreams, async (res) => {
                syncId = res.syncId
                return res.syncOp === SyncOp.SYNC_NEW && res.syncId !== undefined
            }),
        ).toResolve()

        // Bob invites Alice to the channel
        log('Bob invites Alice to the channel')
        event = await makeEvent(
            bobsContext,
            make_UserPayload_UserMembershipAction({
                op: MembershipOp.SO_INVITE,
                userId: addressFromUserId(alicesUserId),
                streamId: channelId,
                streamParentId: spaceId,
            }),
            bobsStream.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await bob.addEvent({
            streamId: bobsUserStreamId,
            event,
        })

        log("Alice waits for Bob's invite event")
        aliceSyncCookie = await waitForEvent(aliceSyncStreams, alicesUserStreamIdStr, (e) => {
            if (
                e.event.payload?.case === 'userPayload' &&
                e.event.payload?.value.content.case === 'userMembership'
            ) {
                log("Alice's received over sync:", {
                    op: e.event.payload?.value.content.value.op,
                    streamId: streamIdAsString(e.event.payload?.value.content.value.streamId),
                    inviter: e.event.payload?.value.content.value.inviter,
                    inviterId: e.event.payload?.value.content.value.inviter
                        ? userIdFromAddress(e.event.payload?.value.content.value.inviter)
                        : undefined,
                    bob: bobsUserId,
                    bobAddress: addressFromUserId(bobsUserId),
                    bobAddress2: bobsContext.creatorAddress,
                    bobAddress3: userIdFromAddress(bobsContext.creatorAddress),
                    inviterEquals: bin_equal(
                        e.event.payload?.value.content.value.inviter,
                        bobsContext.creatorAddress,
                    ),
                    channelIdEquals: bin_equal(
                        e.event.payload?.value.content.value.streamId,
                        channelId,
                    ),
                    inviteEquals:
                        e.event.payload?.value.content.value.op === MembershipOp.SO_INVITE,
                })
                return (
                    e.event.payload?.value.content.value.op === MembershipOp.SO_INVITE &&
                    bin_equal(e.event.payload?.value.content.value.streamId, channelId) &&
                    bin_equal(
                        e.event.payload?.value.content.value.inviter,
                        bobsContext.creatorAddress,
                    )
                )
            }
            return false
        })

        // Alice joins the channel
        event = await makeEvent(
            alicesContext,
            make_UserPayload_UserMembership({
                op: MembershipOp.SO_JOIN,
                streamId: channelId,
                streamParentId: spaceId,
            }),
            alicesStream.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await alice.addEvent({
            streamId: alicesUserStreamId,
            event,
        })

        log('Alice waits for join event in her user stream')
        // Alice sees derived join event in her user stream
        aliceSyncCookie = await waitForEvent(
            aliceSyncStreams,
            alicesUserStreamIdStr,
            (e) =>
                e.event.payload?.case === 'userPayload' &&
                e.event.payload?.value.content.case === 'userMembership' &&
                e.event.payload?.value.content.value.op === MembershipOp.SO_JOIN &&
                bin_equal(e.event.payload?.value.content.value.streamId, channelId),
        )

        // Alice reads previouse messages from the channel
        const channel = await alice.getStream({ streamId: channelId })
        let messageCount = 0
        if (!channel.stream) throw new Error('channel stream not found')
        const envelopes = await unpackStreamEnvelopes(channel.stream)
        envelopes.forEach((e) => {
            const p = e.event.payload
            if (p?.case === 'channelPayload' && p.value.content.case === 'message') {
                messageCount++
                expect(p.value.content.value.ciphertext).toEqual('hello')
            }
        })
        expect(messageCount).toEqual(1)

        await alice.addStreamToSync({
            syncId,
            syncPos: channel.stream.nextSyncCookie!,
        })

        // Bob posts another message
        event = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'Hello, Alice!',
            }),
            channel.stream?.miniblocks.at(-1)?.header?.hash,
        )
        await bob.addEvent({
            streamId: channelId,
            event,
        })

        log('Alice waits for Bob to post another message')
        // Alice sees the message in the channel stream
        await expect(
            waitForEvent(
                aliceSyncStreams,
                channelIdStr,
                (e) =>
                    e.event.payload?.case === 'channelPayload' &&
                    e.event.payload?.value.content.case === 'message' &&
                    e.event.payload?.value.content.value.ciphertext === 'Hello, Alice!',
            ),
        ).toResolve()

        await alice.cancelSync({ syncId })
    })

    test.each([
        [0n, 'never'],
        [{ days: 2 }, 'in two days'],
    ])('cantAddOrCreateWithExpiredDelegateSig expiry: %o expires %s', async (goodExpiry, desc) => {
        log('testing with good expiry of', goodExpiry, 'which expires', desc)
        const jimmy = await makeTestRpcClient()

        const jimmysWallet = ethers.Wallet.createRandom()
        const jimmysDelegateWallet = ethers.Wallet.createRandom()

        const jimmysGoodContext = await makeSignerContext(
            jimmysWallet,
            jimmysDelegateWallet,
            goodExpiry,
        )
        const jimmysExpiredContext = await makeSignerContext(jimmysWallet, jimmysDelegateWallet, {
            days: -2,
        })

        const jimmysUserId = userIdFromAddress(jimmysGoodContext.creatorAddress)
        const jimmysUserStreamId = streamIdToBytes(makeUserStreamId(jimmysUserId))

        const makeUserStreamWith = async (context: SignerContext) => {
            return jimmy.createStream({
                events: [
                    await makeEvent(
                        context,
                        make_UserPayload_Inception({
                            streamId: jimmysUserStreamId,
                        }),
                    ),
                ],
                streamId: jimmysUserStreamId,
            })
        }

        // test create stream
        await expect(makeUserStreamWith(jimmysExpiredContext)).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('7:PERMISSION_DENIED'),
            }),
        )
        await expect(makeUserStreamWith(jimmysGoodContext)).toResolve()

        // create a space
        const spacedStreamId = streamIdToBytes(makeUniqueSpaceStreamId())
        const spaceEvents = await makeEvents(jimmysGoodContext, [
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            make_MemberPayload_Membership2({
                userId: jimmysUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: jimmysUserId,
            }),
        ])
        await jimmy.createStream({
            events: spaceEvents,
            streamId: spacedStreamId,
        })

        // try to leave, first with expired context, then with good context
        const addEventWith = async (context: SignerContext) => {
            const lastMiniblockHash = (
                await jimmy.getLastMiniblockHash({ streamId: jimmysUserStreamId })
            ).hash
            const messageEvent = await makeEvent(
                context,
                make_UserPayload_UserMembership({
                    streamId: spacedStreamId,
                    op: MembershipOp.SO_LEAVE,
                }),
                lastMiniblockHash,
            )
            return jimmy.addEvent({
                streamId: jimmysUserStreamId,
                event: messageEvent,
            })
        }

        // test add event
        await expect(addEventWith(jimmysExpiredContext)).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('7:PERMISSION_DENIED'),
            }),
        )
        await expect(addEventWith(jimmysGoodContext)).toResolve()
    })

    test('cantAddWithBadHash', async () => {
        const bob = await makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
        const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)
        await expect(
            bob.createStream({
                events: [
                    await makeEvent(
                        bobsContext,
                        make_UserPayload_Inception({
                            streamId: bobsUserStreamId,
                        }),
                    ),
                ],
                streamId: bobsUserStreamId,
            }),
        ).toResolve()
        log('Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamIdStr = makeUniqueSpaceStreamId()
        const spacedStreamId = streamIdToBytes(spacedStreamIdStr)
        const spaceEvents = await makeEvents(bobsContext, [
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
            }),
        ])
        await bob.createStream({
            events: spaceEvents,
            streamId: spacedStreamId,
        })
        log('Bob created space, about to create channel')

        const channelIdStr = makeUniqueChannelStreamId(spacedStreamIdStr)
        const channelId = streamIdToBytes(channelIdStr)

        const channelEvents = await makeEvents(bobsContext, [
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
                streamParentId: spacedStreamIdStr,
            }),
        ])
        await bob.createStream({
            events: channelEvents,
            streamId: channelId,
        })
        log('Bob created channel')

        log('Bob fails to create channel with badly chained initial events, hash empty')
        const channelId2Str = makeUniqueChannelStreamId(spacedStreamIdStr)
        const channelId2 = streamIdToBytes(channelId2Str)
        const channelEvent2_0 = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId2,
                spaceId: spacedStreamId,
            }),
        )

        log('Bob fails to create channel with badly chained initial events, wrong hash value')
        const channelEvent2_2 = await makeEvent(
            bobsContext,
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
            }),
            Uint8Array.from(Array(32).fill('1')),
        )
        // TODO: fix up error codes Err.BAD_PREV_EVENTS
        await expect(
            bob.createStream({
                events: [channelEvent2_0, channelEvent2_2],
                streamId: channelId2,
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('19:BAD_STREAM_CREATION_PARAMS'),
            }),
        )

        log('Bob adds event with correct hash')
        const lastMiniblockHash = (await bob.getLastMiniblockHash({ streamId: channelId })).hash
        const messageEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'Hello, World!',
            }),
            lastMiniblockHash,
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
                        ...TEST_ENCRYPTED_MESSAGE_PROPS,
                        ciphertext: 'Hello, World!',
                    }),
                ),
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('3:INVALID_ARGUMENT'),
            }),
        )
    })

    test('cantAddWithBadSignature', async () => {
        const bob = await makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamIdStr = makeUserStreamId(bobsUserId)
        const bobsUserStreamId = streamIdToBytes(bobsUserStreamIdStr)

        await expect(
            bob.createStream({
                events: [
                    await makeEvent(
                        bobsContext,
                        make_UserPayload_Inception({
                            streamId: bobsUserStreamId,
                        }),
                    ),
                ],
                streamId: bobsUserStreamId,
            }),
        ).toResolve()
        log('Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamIdStr = makeUniqueSpaceStreamId()
        const spacedStreamId = streamIdToBytes(spacedStreamIdStr)
        const spaceEvents = await makeEvents(bobsContext, [
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
            }),
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
            }),
        ])
        await bob.createStream({
            events: spaceEvents,
            streamId: spacedStreamId,
        })
        log('Bob created space, about to create channel')

        const channelIdStr = makeUniqueChannelStreamId(spacedStreamIdStr)
        const channelId = streamIdToBytes(channelIdStr)

        const channelEvents = await makeEvents(bobsContext, [
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
            }),
            make_MemberPayload_Membership2({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
                initiatorId: bobsUserId,
            }),
        ])
        await bob.createStream({
            events: channelEvents,
            streamId: channelId,
        })
        log('Bob created channel')

        log('Bob adds event with correct signature')
        const lastMiniblockHash = (await bob.getLastMiniblockHash({ streamId: channelId })).hash
        const messageEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'Hello, World!',
            }),
            lastMiniblockHash,
        )
        channelEvents.push(messageEvent)
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: messageEvent,
            }),
        ).toResolve()

        log('Bob fails to add message twice')
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: messageEvent,
            }),
        ).rejects.toThrow(
            expect.objectContaining({
                message: expect.stringContaining('37:DUPLICATE_EVENT'),
            }),
        )

        log('Bob failes to add event with bad signature')
        const badEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'Nah, not really',
            }),
            lastMiniblockHash,
        )
        badEvent.signature = messageEvent.signature
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: badEvent,
            }),
        ).rejects.toThrow('22:BAD_EVENT_SIGNATURE')

        log('Bob fails with outdated prev minibloc hash')
        const expiredEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: 'Nah, not really',
            }),
            Uint8Array.from(Array(32).fill('1')),
        )
        await expect(
            bob.addEvent({
                streamId: channelId,
                event: expiredEvent,
            }),
        ).rejects.toThrow('24:BAD_PREV_MINIBLOCK_HASH')
    })
})

const waitForEvent = async (
    syncStream: AsyncIterable<SyncStreamsResponse>,
    streamId: string,
    matcher: (e: ParsedEvent) => boolean,
): Promise<SyncCookie> => {
    for await (const res of iterableWrapper(syncStream)) {
        const stream = res.stream
        if (
            stream?.nextSyncCookie?.streamId &&
            bin_equal(stream.nextSyncCookie.streamId, streamIdToBytes(streamId))
        ) {
            const events = await unpackStreamEnvelopes(stream)
            for (const e of events) {
                if (matcher(e)) {
                    return stream.nextSyncCookie
                }
            }
        }
    }
    throw new Error('unreachable')
}
