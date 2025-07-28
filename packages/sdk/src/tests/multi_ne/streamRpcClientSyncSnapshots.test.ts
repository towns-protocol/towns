import { SyncOp } from '@towns-protocol/proto'
import { SignerContext } from '../../signerContext'
import { makeRandomUserContext, makeTestRpcClient } from '../testUtils'
import { makeUserInboxStreamId, streamIdToBytes, userIdFromAddress } from '../../id'
import { make_UserInboxPayload_Ack, make_UserInboxPayload_Inception } from '../../types'
import { makeEvent, unpackStreamAndCookie } from '../../sign'
import { isEqual } from 'lodash-es'

describe('streamRpcClientEnsuresSnapshotsAreSent', () => {
    let alicesContext: SignerContext

    beforeEach(async () => {
        alicesContext = await makeRandomUserContext()
    })

    test('lookForSnapshots', async () => {
        const aliceClient = await makeTestRpcClient()
        const alicesUserId = userIdFromAddress(alicesContext.creatorAddress)
        const alicesUserInboxStreamId = streamIdToBytes(makeUserInboxStreamId(alicesUserId))
        const alicesUserInboxStream = await aliceClient.createStream({
            events: [
                await makeEvent(
                    alicesContext,
                    make_UserInboxPayload_Inception({
                        streamId: alicesUserInboxStreamId,
                    }),
                ),
            ],
            streamId: alicesUserInboxStreamId,
        })

        let syncId: string | undefined = undefined
        let prevMiniblockHash: Uint8Array | undefined =
            alicesUserInboxStream.stream?.miniblocks.at(-1)?.header?.hash

        let didEnd = false // this is just to help createEvents() finish and prevent the test from running for a long time

        async function processSyncResponses() {
            const syncStreams = aliceClient.syncStreams({
                syncPos: [alicesUserInboxStream.stream!.nextSyncCookie!],
            })

            let snapshotsObserved = 0
            for await (const resp of syncStreams) {
                if (resp.syncOp === SyncOp.SYNC_NEW) {
                    syncId = resp.syncId
                } else if (resp.syncOp === SyncOp.SYNC_UPDATE) {
                    const streamAndCookie = resp.stream
                    if (!streamAndCookie) {
                        continue
                    }
                    const { events, snapshot } = await unpackStreamAndCookie(streamAndCookie, {
                        disableHashValidation: false,
                        disableSignatureValidation: true,
                    })
                    alicesUserInboxStream.stream!.nextSyncCookie = streamAndCookie.nextSyncCookie
                    for (const event of events) {
                        if (event.event.payload.case === 'miniblockHeader') {
                            // this is the test we're looking for
                            if (event.event.payload.value.snapshotHash !== undefined) {
                                if (!snapshot) {
                                    didEnd = true
                                    throw new Error('Got snapshot hash but no snapshot')
                                }
                                if (
                                    !isEqual(snapshot?.hash, event.event.payload.value.snapshotHash)
                                ) {
                                    didEnd = true
                                    throw new Error('Snapshot hash mismatch')
                                }
                                snapshotsObserved += 1
                                if (snapshotsObserved > 5) {
                                    didEnd = true
                                    return
                                }
                            }
                            if (event.event.payload.value.snapshot !== undefined) {
                                didEnd = true
                                throw new Error('Got snapshot in legacy format')
                            }
                            prevMiniblockHash = event.hash
                        }
                    }
                }
            }
        }

        async function createEvents() {
            for (let i = 0; i < 100000; i++) {
                if (didEnd) {
                    return
                }
                const event = await makeEvent(
                    alicesContext,
                    make_UserInboxPayload_Ack({ miniblockNum: BigInt(i), deviceKey: 'deviceKey' }),
                    prevMiniblockHash,
                )
                try {
                    await aliceClient.addEvent({
                        streamId: alicesUserInboxStreamId,
                        event,
                    })
                } catch (e) {
                    // this is ok, we're just trying to add a bunch of events and this sometimes fails w
                    // bad prevMiniblockHash
                }
            }

            if (!didEnd) {
                throw new Error('Did not end')
            }
        }

        // Run both functions in parallel
        await expect(Promise.all([processSyncResponses(), createEvents()])).resolves.not.toThrow()

        expect(syncId).toBeDefined()
    })
})
