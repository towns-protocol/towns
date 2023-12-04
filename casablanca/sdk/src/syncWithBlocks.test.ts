import { ConnectError } from '@connectrpc/connect'
import { MembershipOp } from '@river/proto'
import { dlog } from './dlog'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { SignerContext, makeEvent, unpackEnvelopes, unpackStreamResponse } from './sign'
import {
    getMessagePayload,
    getMiniblockHeader,
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
    makeRandomUserContext,
    makeTestRpcClient,
    timeoutIterable,
} from './util.test'

const log = dlog('csb:test:syncWithBlocks')

describe('syncWithBlocks', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test('blocksGetGeneratedAndSynced', async () => {
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
                        settings: { minEventsPerSnapshot: 1, miniblockTimeMs: 1n },
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

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelProperties = 'Bobs channel properties'

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
                channelProperties: make_fake_encryptedData(channelProperties),
                settings: { miniblockTimeMs: 1n, minEventsPerSnapshot: 1 },
            }),
        )
        const channelJoinEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Membership({
                userId: bobsUserId,
                op: MembershipOp.SO_JOIN,
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
        const events = unpackStreamResponse(channel).miniblocks.flatMap((mb) => mb.events)
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
            channel.miniblocks.at(-1)?.header?.hash,
        )
        nextHash = messageEvent.hash
        const resp = await bob.addEvent({
            streamId: channelId,
            event: messageEvent,
        })

        log('addEvent response', { resp })

        // Bob starts sync on the channel
        const abortController = new AbortController()
        const syncStream = bob.syncStreams(
            {
                syncPos: [channel.stream!.nextSyncCookie!],
            },
            {
                signal: abortController.signal,
            },
        )

        // If there is a message, next expect a miniblock header, and vise versa.
        let expectMessage = true
        let blocksSeen = 0
        let abortError: ConnectError | undefined = undefined
        log('===================syncing===================')
        try {
            for await (const res of timeoutIterable(syncStream, 5000)) {
                expect(res.stream).toBeDefined()
                const parsed = unpackEnvelopes(res.stream!.events)
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
                            log('aborting sync')
                            abortController.abort()
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
                            p.envelope.hash,
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
        } catch (e) {
            log('sync done with error', e)
            if (e instanceof ConnectError) {
                abortError = e
            } else {
                throw e
            }
        }

        expect(abortError).toBeDefined()
        expect(abortError?.message).toContain('The operation was aborted.')
        log('done')
    })
})
