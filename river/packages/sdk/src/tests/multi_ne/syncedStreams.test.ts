/**
 * @group main
 */

import { makeEvent, unpackStream } from '../../sign'
import { SyncedStreams } from '../../syncedStreams'
import { SyncState, stateConstraints } from '../../syncedStreamsLoop'
import { makeDonePromise, makeRandomUserContext, makeTestRpcClient, waitFor } from '../testUtils'
import { makeUserInboxStreamId, streamIdToBytes, userIdFromAddress } from '../../id'
import { make_UserInboxPayload_Ack, make_UserInboxPayload_Inception } from '../../types'
import { dlog } from '@river-build/dlog'
import TypedEmitter from 'typed-emitter'
import EventEmitter from 'events'
import { StreamEvents } from '../../streamEvents'
import { SyncedStream } from '../../syncedStream'
import { StubPersistenceStore } from '../../persistenceStore'
import { PartialMessage, PlainMessage } from '@bufbuild/protobuf'
import { Envelope, StreamEvent } from '@river-build/proto'
import { nanoid } from 'nanoid'

const log = dlog('csb:test:syncedStreams')

describe('syncStreams', () => {
    beforeEach(async () => {
        log('beforeEach')
        //        bobsContext = await makeRandomUserContext()
    })

    afterEach(async () => {
        log('afterEach')
    })

    test('waitForSyncingStateTransitions', () => {
        // the syncing, canceling, and not syncing state should not be able to transition to itself, otherwise waitForSyncingState will break
        expect(stateConstraints[SyncState.Syncing].has(SyncState.Syncing)).toBe(false)
        expect(stateConstraints[SyncState.Canceling].has(SyncState.Syncing)).toBe(false)
        expect(stateConstraints[SyncState.NotSyncing].has(SyncState.Syncing)).toBe(false)

        // the starting, and retrying state should both be able to transition to syncing, othwerwise waitForSyncingState will break
        expect(stateConstraints[SyncState.Starting].has(SyncState.Syncing)).toBe(true)
        expect(stateConstraints[SyncState.Retrying].has(SyncState.Syncing)).toBe(true) // if this breaks, we just need to change the two conditions in waitForSyncingState
    })

    test('starting->syncing->canceling->notSyncing', async () => {
        log('starting->syncing->canceling->notSyncing')

        // globals setup
        const stubPersistenceStore = new StubPersistenceStore()
        const done1 = makeDonePromise()
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        mockClientEmitter.on('streamSyncActive', (isActive: boolean) => {
            if (isActive) {
                done1.done()
            }
        })
        // alice setup
        const rpcClient = await makeTestRpcClient()
        const alicesContext = await makeRandomUserContext()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesSyncedStreams = new SyncedStreams(
            alicesUserId,
            rpcClient,
            mockClientEmitter,
            undefined,
        )

        // some helper functions
        const createStream = async (streamId: Uint8Array, events: PartialMessage<Envelope>[]) => {
            const streamResponse = await rpcClient.createStream({
                events,
                streamId,
            })
            const response = await unpackStream(streamResponse.stream, undefined)
            return response
        }

        // user inbox stream setup
        const alicesUserInboxStreamIdStr = makeUserInboxStreamId(alicesUserId)
        const alicesUserInboxStreamId = streamIdToBytes(alicesUserInboxStreamIdStr)
        const userInboxStreamResponse = await createStream(alicesUserInboxStreamId, [
            await makeEvent(
                alicesContext,
                make_UserInboxPayload_Inception({
                    streamId: alicesUserInboxStreamId,
                }),
            ),
        ])
        const userInboxStream = new SyncedStream(
            alicesUserId,
            alicesUserInboxStreamIdStr,
            mockClientEmitter,
            log,
            stubPersistenceStore,
        )
        await userInboxStream.initializeFromResponse(userInboxStreamResponse)

        await alicesSyncedStreams.startSyncStreams()
        await done1.promise

        alicesSyncedStreams.set(alicesUserInboxStreamIdStr, userInboxStream)
        await alicesSyncedStreams.addStreamToSync(userInboxStream.view.syncCookie!)

        // some helper functions
        const addEvent = async (payload: PlainMessage<StreamEvent>['payload']) => {
            await rpcClient.addEvent({
                streamId: alicesUserInboxStreamId,
                event: await makeEvent(
                    alicesContext,
                    payload,
                    userInboxStreamResponse.streamAndCookie.miniblocks[0].hash,
                ),
            })
        }

        // post an ack (easiest way to put a string in a stream)
        await addEvent(
            make_UserInboxPayload_Ack({
                deviceKey: 'numero uno',
                miniblockNum: 1n,
            }),
        )

        // make sure it shows up
        await waitFor(() =>
            expect(
                userInboxStream.view.timeline.find(
                    (e) =>
                        e.remoteEvent?.event.payload.case === 'userInboxPayload' &&
                        e.remoteEvent?.event.payload.value.content.case === 'ack' &&
                        e.remoteEvent?.event.payload.value.content.value.deviceKey === 'numero uno',
                ),
            ).toBeDefined(),
        )
        const sendPing = async () => {
            if (!alicesSyncedStreams.pingInfo) {
                throw new Error('syncId not set')
            }
            const n1 = nanoid()
            const n2 = nanoid()
            alicesSyncedStreams.pingInfo.nonces[n1] = {
                sequence: alicesSyncedStreams.pingInfo.currentSequence++,
                nonce: n1,
                pingAt: performance.now(),
            }
            alicesSyncedStreams.pingInfo.nonces[n2] = {
                sequence: alicesSyncedStreams.pingInfo.currentSequence++,
                nonce: n2,
                pingAt: performance.now(),
            }
            // ping the stream twice in a row
            const p1 = rpcClient.pingSync({
                syncId: alicesSyncedStreams.getSyncId()!,
                nonce: n1,
            })
            const p2 = rpcClient.pingSync({
                syncId: alicesSyncedStreams.getSyncId()!,
                nonce: n2,
            })
            await Promise.all([p1, p2])
            await waitFor(() =>
                expect(alicesSyncedStreams.pingInfo?.nonces[n2].receivedAt).toBeDefined(),
            )
            await waitFor(() =>
                expect(alicesSyncedStreams.pingInfo?.nonces[n1].receivedAt).toBeDefined(),
            )
        }

        for (let i = 0; i < 3; i++) {
            await sendPing()
        }

        // get stream
        const stream = await rpcClient.getStream({
            streamId: alicesUserInboxStreamId,
        })
        expect(stream.stream).toBeDefined()

        // drop the stream
        await rpcClient.info({
            debug: ['drop_stream', alicesSyncedStreams.getSyncId()!, alicesUserInboxStreamIdStr],
        })

        // add second event
        await addEvent(
            make_UserInboxPayload_Ack({
                deviceKey: 'numero dos',
                miniblockNum: 1n,
            }),
        )

        // make sure it shows up
        await waitFor(() =>
            expect(
                userInboxStream.view.timeline.find(
                    (e) =>
                        e.remoteEvent?.event.payload.case === 'userInboxPayload' &&
                        e.remoteEvent?.event.payload.value.content.case === 'ack' &&
                        e.remoteEvent?.event.payload.value.content.value.deviceKey === 'numero dos',
                ),
            ).toBeDefined(),
        )

        await alicesSyncedStreams.stopSync()
    })
})
//     /***** WARNING: This is a MANUAL test case ***** */
//     // not designed to work with CI
//     // once the sync has started, manually kill the server, and restart it.
//     // the test should see the sync retry. (this is a bit of a hack, but it works)
//     // test should stop on its own after you've killed and restarted the server
//     // MAX_SYNC_COUNT times.
//     test.skip('retry loop', async () => {
//         /** Arrange */
//         const done = makeDonePromise()
//         const alice = await makeTestRpcClient()
//         const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
//         const alicesUserStreamId = makeUserStreamId(alicesUserId)
//         // create account for alice
//         const aliceUserStream = await alice.createStream({
//             events: [
//                 await makeEvent(
//                     alicesContext,
//                     make_UserPayload_Inception({
//                         streamId: alicesUserStreamId,
//                     }),
//                 ),
//             ],
//             streamId: alicesUserStreamId,
//         })
//         const { streamAndCookie } = unpackStreamResponse(aliceUserStream)

//         /** Act */
//         const MAX_SYNC_COUNT = 3 // how many times to see the sync succeed before stopping the test.
//         const statesSeen = new Set<SyncState>()
//         let syncSuccessCount = 0 // count how many times the sync has succeeded
//         let syncId: string | undefined
//         let endedSyncId: string | undefined
//         const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
//         const mockStore = mock<PersistenceStore>()
//         const alicesSyncedStreams = new SyncedStreams(
//             alicesUserId,
//             alice,
//             mockStore,
//             mockClientEmitter,
//         )
//         alicesSyncedStreams.on('syncStarting', () => {
//             log('syncStarting')
//             statesSeen.add(SyncState.Starting)
//         })
//         alicesSyncedStreams.on('syncing', (_syncId) => {
//             syncId = _syncId
//             syncSuccessCount++
//             log('syncing', _syncId, 'syncSuccessCount', syncSuccessCount)
//             statesSeen.add(SyncState.Syncing)
//             if (syncSuccessCount >= MAX_SYNC_COUNT) {
//                 // reached max successful re-syncs, cancel the sync to stop the test.
//                 const stopSync = async function () {
//                     await alicesSyncedStreams.stopSync()
//                     done.done()
//                 }
//                 stopSync()
//             }
//         })
//         alicesSyncedStreams.on('syncCanceling', (_syncId) => {
//             endedSyncId = _syncId
//             log('syncCanceling', _syncId)
//             statesSeen.add(SyncState.Canceling)
//         })
//         alicesSyncedStreams.on('syncStopped', () => {
//             log('syncStopped')
//             statesSeen.add(SyncState.NotSyncing)
//         })
//         alicesSyncedStreams.on('syncRetrying', (retryDelay) => {
//             log(`syncRetrying in ${retryDelay} ms`)
//             statesSeen.add(SyncState.Retrying)
//         })

//         alicesSyncedStreams.startSync()
//         await alicesSyncedStreams.addStreamToSync(streamAndCookie.nextSyncCookie)

//         /** Assert */
//         await expect(done.expectToSucceed()).resolves.not.toThrow()
//         expect(syncId).toBeDefined()
//         expect(endedSyncId).toEqual(syncId)
//         expect(statesSeen).toEqual(
//             new Set([
//                 SyncState.Starting,
//                 SyncState.Syncing,
//                 SyncState.Canceling,
//                 SyncState.NotSyncing,
//                 SyncState.Retrying,
//             ]),
//         )
//     }, 1000000)

//     test('addStreamToSync', async () => {
//         /** Arrange */
//         const alice = await makeTestRpcClient()
//         const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
//         const alicesUserStreamId = makeUserStreamId(alicesUserId)
//         const bob = await makeTestRpcClient()
//         const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
//         const bobsUserStreamId = makeUserStreamId(bobsUserId)
//         // create accounts for alice and bob
//         await alice.createStream({
//             events: [
//                 await makeEvent(
//                     alicesContext,
//                     make_UserPayload_Inception({
//                         streamId: alicesUserStreamId,
//                     }),
//                 ),
//             ],
//             streamId: alicesUserStreamId,
//         })
//         await bob.createStream({
//             events: [
//                 await makeEvent(
//                     bobsContext,
//                     make_UserPayload_Inception({
//                         streamId: bobsUserStreamId,
//                     }),
//                 ),
//             ],
//             streamId: bobsUserStreamId,
//         })
//         // alice creates a space
//         const spaceId = makeUniqueSpaceStreamId()
//         const inceptionEvent = await makeEvent(
//             alicesContext,
//             make_SpacePayload_Inception({
//                 streamId: spaceId,
//             }),
//         )
//         const joinEvent = await makeEvent(
//             alicesContext,
//             make_MemberPayload_Membership2({
//                 userId: alicesUserId,
//                 op: MembershipOp.SO_JOIN,
//             }),
//         )
//         await alice.createStream({
//             events: [inceptionEvent, joinEvent],
//             streamId: spaceId,
//         })
//         // alice creates a channel
//         const channelId = makeUniqueChannelStreamId()
//         const channelProperties = 'Alices channel properties'
//         const channelInceptionEvent = await makeEvent(
//             alicesContext,
//             make_ChannelPayload_Inception({
//                 streamId: channelId,
//                 spaceId: spaceId,
//                 channelProperties: make_fake_encryptedData(channelProperties),
//             }),
//         )
//         let event = await makeEvent(
//             alicesContext,
//             make_MemberPayload_Membership2({
//                 userId: alicesUserId,
//                 op: MembershipOp.SO_JOIN,
//             }),
//         )
//         const alicesChannel = await alice.createStream({
//             events: [channelInceptionEvent, event],
//             streamId: channelId,
//         })

//         /** Act */
//         const syncing = makeDonePromise()
//         const messageReceived = makeDonePromise()
//         let syncId: string | undefined
//         let bobReceived: StreamChange | undefined
//         const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
//         const mockStore = mock<PersistenceStore>()
//         const bobsSyncedStreams = new SyncedStreams(bobsUserId, bob, mockStore, mockClientEmitter)
//         // helper function to post a message from alice to the channel
//         async function alicePostsMessage() {
//             // alice posts a message
//             event = await makeEvent(
//                 alicesContext,
//                 make_ChannelPayload_Message({
//                     ...TEST_ENCRYPTED_MESSAGE_PROPS,
//                     ciphertext: 'hello',
//                 }),
//                 alicesChannel.miniblocks.at(-1)?.header?.hash,
//             )
//             await alice.addEvent({
//                 streamId: channelId,
//                 event,
//             })
//         }
//         // listen for the 'syncing' event, which is emitted when the sync
//         // loop begins...
//         bobsSyncedStreams.on('syncing', (_syncId) => {
//             // ...then continue the test in this event handler...
//             syncId = _syncId
//             log('syncing', _syncId)
//             syncing.done()
//         })

//         bobsSyncedStreams.startSync()
//         await syncing.expectToSucceed()
//         const stream = await fetchAndInitStreamAsync(bob, bobsUserId, channelId)
//         if (!stream) {
//             throw new Error('stream not found')
//         }
//         if (!stream.view.syncCookie) {
//             throw new Error('stream has no syncCookie')
//         }
//         stream.on('streamUpdated', (streamId, streamKind, change) => {
//             log('streamUpdated', streamId, streamKind, change)
//             bobReceived = change
//             messageReceived.done()
//         })
//         bobsSyncedStreams.set(channelId, stream)
//         await bobsSyncedStreams.addStreamToSync(stream.view.syncCookie)
//         await alicePostsMessage()
//         await messageReceived.expectToSucceed()

//         /** Assert */
//         expect(syncId).toBeDefined()
//         expect(stream).toBeDefined()
//         expect(bobReceived).toBeDefined()
//     })

//     test('removeStreamFromSync', async () => {
//         /** Arrange */
//         const alice = await makeTestRpcClient()
//         const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
//         const alicesUserStreamId = makeUserStreamId(alicesUserId)
//         const bob = await makeTestRpcClient()
//         const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
//         const bobsUserStreamId = makeUserStreamId(bobsUserId)
//         // create accounts for alice and bob
//         await alice.createStream({
//             events: [
//                 await makeEvent(
//                     alicesContext,
//                     make_UserPayload_Inception({
//                         streamId: alicesUserStreamId,
//                     }),
//                 ),
//             ],
//             streamId: alicesUserStreamId,
//         })
//         await bob.createStream({
//             events: [
//                 await makeEvent(
//                     bobsContext,
//                     make_UserPayload_Inception({
//                         streamId: bobsUserStreamId,
//                     }),
//                 ),
//             ],
//             streamId: bobsUserStreamId,
//         })
//         // alice creates a space
//         const spaceId = makeUniqueSpaceStreamId()
//         const inceptionEvent = await makeEvent(
//             alicesContext,
//             make_SpacePayload_Inception({
//                 streamId: spaceId,
//             }),
//         )
//         const joinEvent = await makeEvent(
//             alicesContext,
//             make_MemberPayload_Membership2({
//                 userId: alicesUserId,
//                 op: MembershipOp.SO_JOIN,
//             }),
//         )
//         await alice.createStream({
//             events: [inceptionEvent, joinEvent],
//             streamId: spaceId,
//         })
//         // alice creates a channel
//         const channelId = makeUniqueChannelStreamId()
//         const channelProperties = 'Alices channel properties'
//         const channelInceptionEvent = await makeEvent(
//             alicesContext,
//             make_ChannelPayload_Inception({
//                 streamId: channelId,
//                 spaceId: spaceId,
//                 channelProperties: make_fake_encryptedData(channelProperties),
//             }),
//         )
//         let event = await makeEvent(
//             alicesContext,
//             make_MemberPayload_Membership2({
//                 userId: alicesUserId,
//                 op: MembershipOp.SO_JOIN,
//             }),
//         )
//         const alicesChannel = await alice.createStream({
//             events: [channelInceptionEvent, event],
//             streamId: channelId,
//         })

//         /** Act */
//         const syncing = makeDonePromise()
//         const firstMessageReceived = makeDonePromise()
//         let bobReceivedCount: number = 0
//         const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
//         const mockStore = mock<PersistenceStore>()
//         const bobsSyncedStreams = new SyncedStreams(bobsUserId, bob, mockStore, mockClientEmitter)
//         // helper function to post a message from alice to the channel
//         async function alicePostsMessage() {
//             // alice posts a message
//             event = await makeEvent(
//                 alicesContext,
//                 make_ChannelPayload_Message({
//                     ...TEST_ENCRYPTED_MESSAGE_PROPS,
//                     ciphertext: 'hello',
//                 }),
//                 alicesChannel.miniblocks.at(-1)?.header?.hash,
//             )
//             await alice.addEvent({
//                 streamId: channelId,
//                 event,
//             })
//         }
//         // listen for the 'syncing' event, which is emitted when the sync
//         // loop begins...
//         bobsSyncedStreams.on('syncing', (_syncId) => {
//             // ...then continue the test in this event handler...
//             log('syncing', _syncId)
//             syncing.done()
//         })

//         bobsSyncedStreams.startSync()
//         await syncing.expectToSucceed()
//         const stream = await fetchAndInitStreamAsync(bob, bobsUserId, channelId)
//         if (!stream) {
//             throw new Error('stream not found')
//         }
//         if (!stream.view.syncCookie) {
//             throw new Error('stream has no syncCookie')
//         }
//         stream.on('streamUpdated', (streamId, streamKind, change) => {
//             log('streamUpdated', streamId, streamKind, change)
//             bobReceivedCount++
//             firstMessageReceived.done()
//         })
//         bobsSyncedStreams.set(channelId, stream)
//         await bobsSyncedStreams.addStreamToSync(stream.view.syncCookie)
//         await alicePostsMessage()
//         await firstMessageReceived.expectToSucceed()
//         await bobsSyncedStreams.removeStreamFromSync(channelId)
//         await alicePostsMessage()

//         /** Assert */
//         // bob should not receive the second message
//         // because the channel was removed from the sync
//         expect(bobReceivedCount).toEqual(1)
//     })
// })

// async function fetchAndInitStreamAsync(
//     rpcClient: PromiseClient<typeof StreamService>,
//     userId: string,
//     streamId: string,
// ): Promise<Stream> {
//     const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
//     // get stream from server
//     const response = await rpcClient.getStream({ streamId })
//     // initialize stream
//     const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
//         unpackStreamResponse(response)
//     const stream = new Stream(
//         userId,
//         streamId,
//         snapshot,
//         prevSnapshotMiniblockNum,
//         mockClientEmitter,
//         log,
//     )
//     stream.initialize(streamAndCookie, snapshot, miniblocks, undefined)
//     return stream
// }
