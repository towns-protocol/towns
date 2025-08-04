/**
 * @group main
 */

import { makeEvent, unpackStream } from '../../sign'
import { SyncedStreams } from '../../syncedStreams'
import { SyncState, stateConstraints } from '../../syncedStreamsLoop'
import { makeDonePromise, makeRandomUserContext, makeTestRpcClient, waitFor } from '../testUtils'
import { makeUserInboxStreamId, streamIdToBytes, userIdFromAddress } from '../../id'
import { make_UserInboxPayload_Ack, make_UserInboxPayload_Inception } from '../../types'
import { dlog, shortenHexString } from '@towns-protocol/dlog'
import TypedEmitter from 'typed-emitter'
import EventEmitter from 'events'
import { StreamEvents } from '../../streamEvents'
import { SyncedStream } from '../../syncedStream'
import { StubPersistenceStore } from '../../persistenceStore'
import { Envelope, StreamEvent, PlainMessage } from '@towns-protocol/proto'
import { nanoid } from 'nanoid'
import { StreamsView, StreamsViewDelegate } from '../../views/streamsView'

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

        // the starting, and retrying state should both be able to transition to syncing, otherwise waitForSyncingState will break
        expect(stateConstraints[SyncState.Starting].has(SyncState.Syncing)).toBe(true)
        expect(stateConstraints[SyncState.Retrying].has(SyncState.Syncing)).toBe(true) // if this breaks, we just need to change the two conditions in waitForSyncingState
    })

    test('starting->syncing->canceling->notSyncing', async () => {
        log('starting->syncing->canceling->notSyncing')

        // globals setup
        const stubPersistenceStore = new StubPersistenceStore()
        const done1 = makeDonePromise()
        let userInboxDeviceSummaryUpdatedCount = 0
        const mockClientEmitter = new EventEmitter() as TypedEmitter<StreamEvents>
        mockClientEmitter.on('streamSyncActive', (isActive: boolean) => {
            if (isActive) {
                done1.done()
            }
        })
        mockClientEmitter.on('userInboxDeviceSummaryUpdated', () => {
            userInboxDeviceSummaryUpdatedCount++
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
            shortenHexString(alicesUserId),
            { useSharedSyncer: false },
        )

        // some helper functions
        const createStream = async (streamId: Uint8Array, events: PlainMessage<Envelope>[]) => {
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

        const streamsViewDelegate: StreamsViewDelegate = {
            isDMMessageEventBlocked: (_event) => {
                return false
            },
        }
        const streamsView = new StreamsView(alicesUserId, streamsViewDelegate)
        const userInboxStream = new SyncedStream(
            alicesUserId,
            alicesUserInboxStreamIdStr,
            streamsView,
            mockClientEmitter,
            log,
            stubPersistenceStore,
        )
        await userInboxStream.initializeFromResponse(userInboxStreamResponse)

        alicesSyncedStreams.startSyncStreams({})
        await done1.promise

        alicesSyncedStreams.set(alicesUserInboxStreamIdStr, userInboxStream)
        alicesSyncedStreams.addStreamToSync(
            alicesUserInboxStreamIdStr,
            userInboxStream.view.syncCookie!,
        )

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
        // assert assumptions
        expect(userInboxDeviceSummaryUpdatedCount).toBe(0)

        // post an ack (easiest way to put a string in a stream)
        await addEvent(
            make_UserInboxPayload_Ack({
                deviceKey: 'numero uno',
                miniblockNum: 1n,
            }),
        )

        // make sure it shows up
        await waitFor(() => {
            expect(userInboxDeviceSummaryUpdatedCount).toBe(1)
        })
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

        // assert assumptions
        expect(userInboxDeviceSummaryUpdatedCount).toBe(1)

        // add second event
        await addEvent(
            make_UserInboxPayload_Ack({
                deviceKey: 'numero dos',
                miniblockNum: 1n,
            }),
        )

        // make sure it shows up
        await waitFor(() => expect(userInboxDeviceSummaryUpdatedCount).toBe(2))

        await alicesSyncedStreams.stopSync()
    })
})
