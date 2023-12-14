import { SignerContext, makeEvent, unpackStreamResponse } from './sign'
import { SyncState, SyncedStreams } from './syncedStreams'
import {
    TEST_ENCRYPTED_MESSAGE_PROPS,
    makeDonePromise,
    makeRandomUserContext,
    makeTestRpcClient,
} from './util.test'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    userIdFromAddress,
} from './id'
import {
    make_ChannelPayload_Inception,
    make_ChannelPayload_Membership,
    make_ChannelPayload_Message,
    make_SpacePayload_Inception,
    make_SpacePayload_Membership,
    make_UserPayload_Inception,
    make_fake_encryptedData,
} from './types'

import { EmittedEvents } from './client'
import { MembershipOp, StreamService } from '@river/proto'
import { PersistenceStore } from './persistenceStore'
import { Stream } from './stream'
import { StreamChange } from './streamEvents'
import TypedEventEmitter from 'typed-emitter'
import { dlog } from './dlog'
import { mock } from 'jest-mock-extended'
import { PromiseClient } from '@connectrpc/connect'

const log = dlog('csb:test:syncedStreams')

describe('syncStreams', () => {
    let alicesContext: SignerContext
    let bobsContext: SignerContext

    beforeEach(async () => {
        alicesContext = await makeRandomUserContext()
        bobsContext = await makeRandomUserContext()
    })

    test('starting->syncing->canceling->notSyncing', async () => {
        /** Arrange */
        const done = makeDonePromise()
        const alice = makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamId = makeUserStreamId(alicesUserId)
        // create account for alice
        const aliceUserStream = await alice.createStream({
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
        const { streamAndCookie } = unpackStreamResponse(aliceUserStream)

        /** Act */
        const statesSeen = new Set<SyncState>()
        let syncId: string | undefined
        let endedSyncId: string | undefined
        const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
        const mockStore = mock<PersistenceStore>()
        const alicesSyncedStreams = new SyncedStreams(
            alicesUserId,
            alice,
            mockStore,
            mockClientEmitter,
        )
        alicesSyncedStreams.on('syncStarting', () => {
            log('syncStarting')
            statesSeen.add(SyncState.Starting)
        })
        alicesSyncedStreams.on('syncing', (_syncId) => {
            syncId = _syncId
            log('syncing', _syncId)
            statesSeen.add(SyncState.Syncing)
            // once the sync has started, cancel it to stop the test.
            const stopSync = async function () {
                await alicesSyncedStreams.stopSync()
            }
            stopSync()
        })
        alicesSyncedStreams.on('syncCanceling', (_syncId) => {
            endedSyncId = _syncId
            log('syncCanceling', _syncId)
            statesSeen.add(SyncState.Canceling)
        })
        alicesSyncedStreams.on('syncStopped', () => {
            log('syncStopped')
            statesSeen.add(SyncState.NotSyncing)
            done.done()
        })
        alicesSyncedStreams.startSync()
        await alicesSyncedStreams.addStreamToSync(streamAndCookie.nextSyncCookie)

        /** Assert */
        await expect(done.expectToSucceed()).toResolve()
        expect(syncId).toBeDefined()
        expect(endedSyncId).toEqual(syncId)
        expect(statesSeen).toEqual(
            new Set([
                SyncState.Starting,
                SyncState.Syncing,
                SyncState.Canceling,
                SyncState.NotSyncing,
            ]),
        )
    })

    /***** WARNING: This is a MANUAL test case ***** */
    // not designed to work with CI
    // once the sync has started, manually kill the server, and restart it.
    // the test should see the sync retry. (this is a bit of a hack, but it works)
    // test should stop on its own after you've killed and restarted the server
    // MAX_SYNC_COUNT times.
    test.skip('retry loop', async () => {
        /** Arrange */
        const done = makeDonePromise()
        const alice = makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamId = makeUserStreamId(alicesUserId)
        // create account for alice
        const aliceUserStream = await alice.createStream({
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
        const { streamAndCookie } = unpackStreamResponse(aliceUserStream)

        /** Act */
        const MAX_SYNC_COUNT = 3 // how many times to see the sync succeed before stopping the test.
        const statesSeen = new Set<SyncState>()
        let syncSuccessCount = 0 // count how many times the sync has succeeded
        let syncId: string | undefined
        let endedSyncId: string | undefined
        const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
        const mockStore = mock<PersistenceStore>()
        const alicesSyncedStreams = new SyncedStreams(
            alicesUserId,
            alice,
            mockStore,
            mockClientEmitter,
        )
        alicesSyncedStreams.on('syncStarting', () => {
            log('syncStarting')
            statesSeen.add(SyncState.Starting)
        })
        alicesSyncedStreams.on('syncing', (_syncId) => {
            syncId = _syncId
            syncSuccessCount++
            log('syncing', _syncId, 'syncSuccessCount', syncSuccessCount)
            statesSeen.add(SyncState.Syncing)
            if (syncSuccessCount >= MAX_SYNC_COUNT) {
                // reached max successful re-syncs, cancel the sync to stop the test.
                const stopSync = async function () {
                    await alicesSyncedStreams.stopSync()
                    done.done()
                }
                stopSync()
            }
        })
        alicesSyncedStreams.on('syncCanceling', (_syncId) => {
            endedSyncId = _syncId
            log('syncCanceling', _syncId)
            statesSeen.add(SyncState.Canceling)
        })
        alicesSyncedStreams.on('syncStopped', () => {
            log('syncStopped')
            statesSeen.add(SyncState.NotSyncing)
        })
        alicesSyncedStreams.on('syncRetrying', (retryDelay) => {
            log(`syncRetrying in ${retryDelay} ms`)
            statesSeen.add(SyncState.Retrying)
        })

        alicesSyncedStreams.startSync()
        await alicesSyncedStreams.addStreamToSync(streamAndCookie.nextSyncCookie)

        /** Assert */
        await expect(done.expectToSucceed()).toResolve()
        expect(syncId).toBeDefined()
        expect(endedSyncId).toEqual(syncId)
        expect(statesSeen).toEqual(
            new Set([
                SyncState.Starting,
                SyncState.Syncing,
                SyncState.Canceling,
                SyncState.NotSyncing,
                SyncState.Retrying,
            ]),
        )
    }, 1000000)

    test('addStreamToSync', async () => {
        /** Arrange */
        const alice = makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamId = makeUserStreamId(alicesUserId)
        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
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
        // alice creates a space
        const spaceId = makeSpaceStreamId('alices-space-' + genId())
        const inceptionEvent = await makeEvent(
            alicesContext,
            make_SpacePayload_Inception({
                streamId: spaceId,
            }),
        )
        const joinEvent = await makeEvent(
            alicesContext,
            make_SpacePayload_Membership({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
            }),
        )
        await alice.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: spaceId,
        })
        // alice creates a channel
        const channelId = makeChannelStreamId('alices-channel-' + genId())
        const channelProperties = 'Alices channel properties'
        const channelInceptionEvent = await makeEvent(
            alicesContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spaceId,
                channelProperties: make_fake_encryptedData(channelProperties),
            }),
        )
        let event = await makeEvent(
            alicesContext,
            make_ChannelPayload_Membership({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
            }),
        )
        const alicesChannel = await alice.createStream({
            events: [channelInceptionEvent, event],
            streamId: channelId,
        })

        /** Act */
        const syncing = makeDonePromise()
        const messageReceived = makeDonePromise()
        let syncId: string | undefined
        let bobReceived: StreamChange | undefined
        const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
        const mockStore = mock<PersistenceStore>()
        const bobsSyncedStreams = new SyncedStreams(bobsUserId, bob, mockStore, mockClientEmitter)
        // helper function to post a message from alice to the channel
        async function alicePostsMessage() {
            // alice posts a message
            event = await makeEvent(
                alicesContext,
                make_ChannelPayload_Message({
                    ...TEST_ENCRYPTED_MESSAGE_PROPS,
                    ciphertext: 'hello',
                }),
                alicesChannel.miniblocks.at(-1)?.header?.hash,
            )
            await alice.addEvent({
                streamId: channelId,
                event,
            })
        }
        // listen for the 'syncing' event, which is emitted when the sync
        // loop begins...
        bobsSyncedStreams.on('syncing', (_syncId) => {
            // ...then continue the test in this event handler...
            syncId = _syncId
            log('syncing', _syncId)
            syncing.done()
        })

        bobsSyncedStreams.startSync()
        await syncing.expectToSucceed()
        const stream = await fetchAndInitStreamAsync(bob, bobsUserId, channelId)
        if (!stream) {
            throw new Error('stream not found')
        }
        if (!stream.view.syncCookie) {
            throw new Error('stream has no syncCookie')
        }
        stream.on('streamUpdated', (streamId, streamKind, change) => {
            log('streamUpdated', streamId, streamKind, change)
            bobReceived = change
            messageReceived.done()
        })
        bobsSyncedStreams.set(channelId, stream)
        await bobsSyncedStreams.addStreamToSync(stream.view.syncCookie)
        await alicePostsMessage()
        await messageReceived.expectToSucceed()

        /** Assert */
        expect(syncId).toBeDefined()
        expect(stream).toBeDefined()
        expect(bobReceived).toBeDefined()
    })

    test('removeStreamFromSync', async () => {
        /** Arrange */
        const alice = makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserStreamId = makeUserStreamId(alicesUserId)
        const bob = makeTestRpcClient()
        const bobsUserId = userIdFromAddress(bobsContext.creatorAddress)
        const bobsUserStreamId = makeUserStreamId(bobsUserId)
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
        // alice creates a space
        const spaceId = makeSpaceStreamId('alices-space-' + genId())
        const inceptionEvent = await makeEvent(
            alicesContext,
            make_SpacePayload_Inception({
                streamId: spaceId,
            }),
        )
        const joinEvent = await makeEvent(
            alicesContext,
            make_SpacePayload_Membership({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
            }),
        )
        await alice.createStream({
            events: [inceptionEvent, joinEvent],
            streamId: spaceId,
        })
        // alice creates a channel
        const channelId = makeChannelStreamId('alices-channel-' + genId())
        const channelProperties = 'Alices channel properties'
        const channelInceptionEvent = await makeEvent(
            alicesContext,
            make_ChannelPayload_Inception({
                streamId: channelId,
                spaceId: spaceId,
                channelProperties: make_fake_encryptedData(channelProperties),
            }),
        )
        let event = await makeEvent(
            alicesContext,
            make_ChannelPayload_Membership({
                userId: alicesUserId,
                op: MembershipOp.SO_JOIN,
            }),
        )
        const alicesChannel = await alice.createStream({
            events: [channelInceptionEvent, event],
            streamId: channelId,
        })

        /** Act */
        const syncing = makeDonePromise()
        const firstMessageReceived = makeDonePromise()
        let bobReceivedCount: number = 0
        const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
        const mockStore = mock<PersistenceStore>()
        const bobsSyncedStreams = new SyncedStreams(bobsUserId, bob, mockStore, mockClientEmitter)
        // helper function to post a message from alice to the channel
        async function alicePostsMessage() {
            // alice posts a message
            event = await makeEvent(
                alicesContext,
                make_ChannelPayload_Message({
                    ...TEST_ENCRYPTED_MESSAGE_PROPS,
                    ciphertext: 'hello',
                }),
                alicesChannel.miniblocks.at(-1)?.header?.hash,
            )
            await alice.addEvent({
                streamId: channelId,
                event,
            })
        }
        // listen for the 'syncing' event, which is emitted when the sync
        // loop begins...
        bobsSyncedStreams.on('syncing', (_syncId) => {
            // ...then continue the test in this event handler...
            log('syncing', _syncId)
            syncing.done()
        })

        bobsSyncedStreams.startSync()
        await syncing.expectToSucceed()
        const stream = await fetchAndInitStreamAsync(bob, bobsUserId, channelId)
        if (!stream) {
            throw new Error('stream not found')
        }
        if (!stream.view.syncCookie) {
            throw new Error('stream has no syncCookie')
        }
        stream.on('streamUpdated', (streamId, streamKind, change) => {
            log('streamUpdated', streamId, streamKind, change)
            bobReceivedCount++
            firstMessageReceived.done()
        })
        bobsSyncedStreams.set(channelId, stream)
        await bobsSyncedStreams.addStreamToSync(stream.view.syncCookie)
        await alicePostsMessage()
        await firstMessageReceived.expectToSucceed()
        await bobsSyncedStreams.removeStreamFromSync(channelId)
        await alicePostsMessage()

        /** Assert */
        // bob should not receive the second message
        // because the channel was removed from the sync
        expect(bobReceivedCount).toEqual(1)
    })
})

async function fetchAndInitStreamAsync(
    rpcClient: PromiseClient<typeof StreamService>,
    userId: string,
    streamId: string,
): Promise<Stream> {
    const mockClientEmitter = mock<TypedEventEmitter<EmittedEvents>>()
    // get stream from server
    const response = await rpcClient.getStream({ streamId })
    // initialize stream
    const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
        unpackStreamResponse(response)
    const stream = new Stream(
        userId,
        streamId,
        snapshot,
        prevSnapshotMiniblockNum,
        mockClientEmitter,
        log,
    )
    stream.initialize(streamAndCookie, snapshot, miniblocks, undefined)
    return stream
}
