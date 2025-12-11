/**
 * @group main
 */

import { Client } from '../../client'
import { makeDonePromise, makeTestClient, makeUniqueSpaceStreamId, waitFor } from '../testUtils'
import { dlog } from '@towns-protocol/utils'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import { UserInboxPayload_GroupEncryptionSessions } from '@towns-protocol/proto'
import { makeUniqueChannelStreamId, makeUserInboxStreamId, streamIdAsString } from '../../id'

const log = dlog('test:inboxMessage')

describe('inboxMessageTest', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    // should iterate over all the algorithms
    test.each(Object.values(GroupEncryptionAlgorithmId))(
        'bobSendsAliceInboxMessage',
        async (algorithm) => {
            log('bobSendsAliceInboxMessage')
            // Bob gets created, creates a space, and creates a channel.
            await expect(bobsClient.initializeUser()).resolves.not.toThrow()
            bobsClient.startSync()
            // Alice gets created.
            await expect(alicesClient.initializeUser()).resolves.not.toThrow()
            const aliceUserStreamId = alicesClient.userStreamId
            log('aliceUserStreamId', aliceUserStreamId)
            alicesClient.startSync()

            const fakeStreamId = makeUniqueChannelStreamId(makeUniqueSpaceStreamId())
            const aliceSelfInbox = makeDonePromise()
            alicesClient.once(
                'newGroupSessions',
                (
                    sessions: UserInboxPayload_GroupEncryptionSessions,
                    senderUserId: string,
                ): void => {
                    log('inboxMessage for Alice', sessions, senderUserId)
                    aliceSelfInbox.runAndDone(() => {
                        expect(senderUserId).toEqual(bobsClient.userId)
                        expect(streamIdAsString(sessions.streamId)).toEqual(fakeStreamId)
                        expect(sessions.sessionIds).toEqual(['300'])
                        expect(
                            sessions.ciphertexts[alicesClient.userDeviceKey().deviceKey],
                        ).toBeDefined()
                    })
                },
            )

            // bob sends a message to Alice's device.
            await expect(
                bobsClient.encryptAndShareGroupSessionsToDevice(
                    fakeStreamId,
                    [
                        {
                            streamId: fakeStreamId,
                            sessionId: '300',
                            sessionKey: '400',
                            algorithm,
                        },
                    ],
                    algorithm,
                    alicesClient.userId,
                    [alicesClient.userDeviceKey()],
                ),
            ).resolves.not.toThrow()
            await aliceSelfInbox.expectToSucceed()
        },
    )

    /**
     * Test to verify that getMiniblocks works correctly for trimmed UserInbox streams.
     *
     * This test:
     * 1. Creates a user inbox stream
     * 2. Loads up the stream with many events to generate multiple miniblocks
     * 3. Calls a debug RPC to force stream trimming (mocked for now)
     * 4. Verifies getMiniblocks returns correct data for ranges outside trimmed area
     */
    test('userInboxStreamTrimmingTest', async () => {
        log('userInboxStreamTrimmingTest')

        // Initialize Alice's client and user inbox stream
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        // Initialize Bob's client
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const alicesUserInboxStreamId = makeUserInboxStreamId(alicesClient.userId)
        log('alicesUserInboxStreamId', alicesUserInboxStreamId)

        // Generate miniblocks with one event each.
        // UserInbox stream generates a snapshot every 10 events.
        // We'll create 25 events/miniblocks to get 2 snapshots (at miniblocks 10, 20)
        // plus the genesis miniblock 0 has a snapshot = 3 total snapshots.
        const numMessages = 25
        const fakeStreamId = makeUniqueChannelStreamId(makeUniqueSpaceStreamId())

        log('Sending', numMessages, 'messages and forcing miniblock after each...')
        for (let i = 0; i < numMessages; i++) {
            // Send an inbox message
            await bobsClient.encryptAndShareGroupSessionsToDevice(
                fakeStreamId,
                [
                    {
                        streamId: fakeStreamId,
                        sessionId: `session-${i}`,
                        sessionKey: `key-${i}`,
                        algorithm: GroupEncryptionAlgorithmId.GroupEncryption,
                    },
                ],
                GroupEncryptionAlgorithmId.GroupEncryption,
                alicesClient.userId,
                [alicesClient.userDeviceKey()],
            )

            // Force create a miniblock after each message
            await alicesClient.rpcClient.info({
                debug: ['make_miniblock', alicesUserInboxStreamId],
            })
        }
        log('Finished sending messages and creating miniblocks')

        // Wait for the stream to sync with all miniblocks
        const alicesInboxStream = alicesClient.streams.get(alicesUserInboxStreamId)
        expect(alicesInboxStream).toBeDefined()

        await waitFor(() => {
            const miniblockInfo = alicesInboxStream!.view.miniblockInfo
            log('Current miniblock info:', miniblockInfo)
            expect(miniblockInfo).toBeDefined()
            // We should have 25 miniblocks (1-25) plus genesis (0) = max should be 25
            expect(miniblockInfo!.max).toBeGreaterThanOrEqual(25n)
        })

        const miniblockInfoBeforeTrim = alicesInboxStream!.view.miniblockInfo!
        log('Miniblock info before trim:', {
            min: miniblockInfoBeforeTrim.min.toString(),
            max: miniblockInfoBeforeTrim.max.toString(),
        })

        // Verify we have exactly 25 miniblocks (0-25, so max=25)
        // Genesis miniblock is 0, then we created 25 more (1-25)
        expect(miniblockInfoBeforeTrim.max).toBe(25n)
        expect(miniblockInfoBeforeTrim.min).toBe(0n)

        // Verify snapshots: miniblock 0 (genesis) + miniblocks 10, 20 = 3 snapshots
        // We can verify this by fetching miniblocks and checking which have snapshots
        const allMiniblocks = await alicesClient.getMiniblocks(
            alicesUserInboxStreamId,
            0n,
            26n, // 0 to 25 inclusive
            undefined,
            { skipPersistence: true },
        )

        // Count miniblocks with snapshots
        const miniblocksWithSnapshots = allMiniblocks.miniblocks.filter(
            (mb) => mb.header.snapshot !== undefined && mb.header.snapshot.members !== undefined,
        )
        log(
            'Miniblocks with snapshots:',
            miniblocksWithSnapshots.map((mb) => mb.header.miniblockNum.toString()),
        )

        // Expect 3 snapshots: at miniblocks 0, 10, 20
        expect(miniblocksWithSnapshots.length).toBe(3)
        const snapshotMiniblockNums = miniblocksWithSnapshots
            .map((mb) => Number(mb.header.miniblockNum))
            .sort((a, b) => a - b)
        expect(snapshotMiniblockNums).toEqual([0, 10, 20])

        // Trim up to miniblock 20 (the latest snapshot before end)
        // This means we'll delete miniblocks 0-19 and keep 20-25 (6 miniblocks with 1 snapshot)
        const trimToMiniblock = 20

        log('Trimming stream to miniblock:', trimToMiniblock)

        // Call debug RPC to force stream trimming
        await alicesClient.rpcClient.info({
            debug: ['force_trim_stream', alicesUserInboxStreamId, trimToMiniblock.toString()],
        })

        log('Stream trimmed successfully')

        // Now test getMiniblocks for a range that was trimmed (should fail or return empty)
        // Request miniblocks from 1 to 30 (these should be trimmed, miniblocks 0-29 deleted)
        const trimmedFromInclusive = 1n
        const trimmedToExclusive = BigInt(trimToMiniblock) // 30

        log('Calling getMiniblocks for trimmed range:', {
            fromInclusive: trimmedFromInclusive.toString(),
            toExclusive: trimmedToExclusive.toString(),
        })

        const trimmedResult = await alicesClient.getMiniblocks(
            alicesUserInboxStreamId,
            trimmedFromInclusive,
            trimmedToExclusive,
            undefined,
            { skipPersistence: true },
        )

        log('getMiniblocks result for trimmed range:', {
            numMiniblocks: trimmedResult.miniblocks.length,
            terminus: trimmedResult.terminus,
        })

        // The trimmed range should return no miniblocks and indicate terminus
        // since those miniblocks have been deleted
        expect(trimmedResult.miniblocks.length).toBe(0)
        expect(trimmedResult.terminus).toBe(true)

        // Now test getMiniblocks for the valid range (miniblock 20-25)
        const validFromInclusive = BigInt(trimToMiniblock) // 20
        const validToExclusive = miniblockInfoBeforeTrim.max + 1n // 26

        log('Calling getMiniblocks for valid range:', {
            fromInclusive: validFromInclusive.toString(),
            toExclusive: validToExclusive.toString(),
        })

        const validResult = await alicesClient.getMiniblocks(
            alicesUserInboxStreamId,
            validFromInclusive,
            validToExclusive,
            undefined,
            { skipPersistence: true },
        )

        log('getMiniblocks result for valid range:', {
            numMiniblocks: validResult.miniblocks.length,
            terminus: validResult.terminus,
        })

        // The valid range should return 6 miniblocks (20, 21, 22, 23, 24, 25)
        expect(validResult.miniblocks.length).toBe(6)

        // Verify miniblock numbers are in expected range
        const validMiniblockNums = validResult.miniblocks
            .map((mb) => Number(mb.header.miniblockNum))
            .sort((a, b) => a - b)
        expect(validMiniblockNums).toEqual([20, 21, 22, 23, 24, 25])

        // Only miniblock 20 should have a snapshot (1 snapshot remaining after trim)
        const validMiniblocksWithSnapshots = validResult.miniblocks.filter(
            (mb) => mb.header.snapshot !== undefined && mb.header.snapshot.members !== undefined,
        )
        expect(validMiniblocksWithSnapshots.length).toBe(1)
        expect(validMiniblocksWithSnapshots[0].header.miniblockNum).toBe(20n)

        log('userInboxStreamTrimmingTest completed successfully')
    })
})
