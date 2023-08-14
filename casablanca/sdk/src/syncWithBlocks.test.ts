import { ConnectError } from '@bufbuild/connect'
import { MembershipOp } from '@river/proto'
import _ from 'lodash'
import { dlog } from './dlog'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import { SignerContext, makeEvent, unpackEnvelopes } from './sign'
import {
    getMessagePayload,
    getMiniblockHeader,
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
} from './types'
import { makeRandomUserContext, makeTestRpcClient, timeoutIterable } from './util.test'

const log = dlog('csb:test:syncWithBlocks')

describe('streamRpcClient', () => {
    let bobsContext: SignerContext

    beforeEach(async () => {
        bobsContext = await makeRandomUserContext()
    })

    test('blocksGetGeratedAndSynced', async () => {
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
                    [],
                ),
            ],
        })
        log('Bob created user, about to create space')

        // Bob creates space and channel
        const spacedStreamId = makeSpaceStreamId('bobs-space-' + genId())
        const spaceInceptionEvent = await makeEvent(
            bobsContext,
            make_SpacePayload_Inception({
                streamId: spacedStreamId,
                name: 'Bobs space',
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

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const channelProperties = 'Bobs channel properties'

        const channelInceptionEvent = await makeEvent(
            bobsContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spacedStreamId,
                channelProperties: { text: channelProperties },
                settings: { miniblockTimeMs: 1n, minEventsPerSnapshot: 1 },
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

        // Last event must be a genesis miniblock header.
        const events = unpackEnvelopes(channel.stream!.events)
        const lastEvent = _.last(events)
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
                text,
            }),
            [nextHash],
        )
        nextHash = messageEvent.hash
        await bob.addEvent({
            streamId: channelId,
            event: messageEvent,
        })

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
        try {
            for await (const res of timeoutIterable(syncStream, 2000)) {
                expect(res.streams).toHaveLength(1)
                const parsed = unpackEnvelopes(res.streams[0].events)
                for (const p of parsed) {
                    if (knownHashes.has(p.hashStr)) {
                        continue
                    }
                    knownHashes.add(p.hashStr)

                    if (expectMessage) {
                        const message = getMessagePayload(p)
                        expect(message).toBeDefined()
                        expect(message?.text).toEqual(text)

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
                        blocksSeen++

                        const messageEvent = await makeEvent(
                            bobsContext,
                            make_ChannelPayload_Message({
                                text,
                            }),
                            [nextHash],
                        )
                        nextHash = messageEvent.hash
                        await bob.addEvent({
                            streamId: channelId,
                            event: messageEvent,
                        })
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
        expect(abortError?.message).toContain('AbortError: The operation was aborted.')
        log('done')
    })
})
