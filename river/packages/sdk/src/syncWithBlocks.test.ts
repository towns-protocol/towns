/**
 * @group main
 */
import { MembershipOp, StreamAndCookie, SyncOp } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import {
    makeUniqueChannelStreamId,
    makeUserStreamId,
    streamIdToBytes,
    userIdFromAddress,
} from './id'
import { makeEvent, unpackStream, unpackStreamEnvelopes } from './sign'
import {
    getMessagePayload,
    getMiniblockHeader,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Message,
    make_MemberPayload_Membership2,
    make_SpacePayload_Inception,
    make_UserPayload_Inception,
} from './types'
import {
    TEST_ENCRYPTED_MESSAGE_PROPS,
    makeRandomUserContext,
    makeTestRpcClient,
    makeUniqueSpaceStreamId,
    iterableWrapper,
} from './util.test'
import { SignerContext } from './signerContext'

const log = dlog('csb:test:syncWithBlocks')

describe('syncWithBlocks', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test('blocksGetGeneratedAndSynced', async () => {
        log('start')

        const bob = await makeTestRpcClient()

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

        // Last event must be a genesis miniblock header.
        const events = (await unpackStream(channel.stream)).streamAndCookie.miniblocks.flatMap(
            (mb) => mb.events,
        )
        const lastEvent = events.at(-1)
        const miniblockHeader = getMiniblockHeader(lastEvent)
        expect(miniblockHeader).toBeDefined()
        expect(miniblockHeader?.miniblockNum).toEqual(0n)
        expect(miniblockHeader?.eventHashes).toHaveLength(2)

        const knownHashes = new Set(events.map((e) => e.hashStr))

        // Post a message to the channel
        let text = 'hello '
        const messageEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Message({
                ...TEST_ENCRYPTED_MESSAGE_PROPS,
                ciphertext: text,
            }),
            channel.stream?.miniblocks.at(-1)?.header?.hash,
        )
        nextHash = messageEvent.hash
        const resp = await bob.addEvent({
            streamId: channelId,
            event: messageEvent,
        })

        log('addEvent response', { resp })

        // Bob starts sync on the channel
        const syncStream = bob.syncStreams({
            syncPos: [channel.stream!.nextSyncCookie!],
        })

        // If there is a message, next expect a miniblock header, and vise versa.
        let expectMessage = true
        let blocksSeen = 0
        log('===================syncing===================')
        for await (const res of iterableWrapper(syncStream)) {
            if (res.syncOp === SyncOp.SYNC_CLOSE) {
                // done with sync
                break
            }
            if (res.syncOp !== SyncOp.SYNC_UPDATE || !res.stream) {
                // skip non-stream cookie responses
                continue
            }
            const stream: StreamAndCookie | undefined = res.stream
            expect(stream).toBeDefined()
            const parsed = await unpackStreamEnvelopes(res.stream)
            log('===================sunk===================', { parsed })
            for (const p of parsed) {
                if (knownHashes.has(p.hashStr)) {
                    continue
                }
                knownHashes.add(p.hashStr)

                if (expectMessage) {
                    const message = getMessagePayload(p)
                    expect(message).toBeDefined()
                    expect(message?.ciphertext).toEqual(text)
                    log('messageSeen', { message })
                    expectMessage = false
                } else {
                    const miniblockHeader = getMiniblockHeader(p)
                    expect(miniblockHeader).toBeDefined()
                    expect(miniblockHeader?.miniblockNum).toEqual(BigInt(blocksSeen + 1))
                    expect(miniblockHeader?.eventHashes).toHaveLength(1)
                    expect(miniblockHeader?.eventHashes[0]).toEqual(nextHash)

                    if (blocksSeen > 10) {
                        log('cancel sync')
                        await bob.cancelSync({ syncId: res.syncId })
                        break
                    }
                    expectMessage = true
                    text = `${text} ${blocksSeen}`
                    log('expectMessgage', { text })
                    blocksSeen++

                    const messageEvent = await makeEvent(
                        bobsContext,
                        make_ChannelPayload_Message({
                            ...TEST_ENCRYPTED_MESSAGE_PROPS,
                            ciphertext: text,
                        }),
                        p.hash,
                    )
                    nextHash = messageEvent.hash
                    const response = await bob.addEvent({
                        streamId: channelId,
                        event: messageEvent,
                    })
                    log('addEvent response', { response })
                }
            }
        }

        log('done')
    })
})
