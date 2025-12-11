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

        // Generate many inbox messages to create multiple miniblocks
        // Each message will be a group session share from Bob to Alice
        const numMessages = 50 // Generate enough messages to create multiple miniblocks
        const fakeStreamId = makeUniqueChannelStreamId(makeUniqueSpaceStreamId())

        log('Sending', numMessages, 'messages to create miniblocks...')
        for (let i = 0; i < numMessages; i++) {
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
        }
        log('Finished sending messages')

        // Wait for the stream to have multiple miniblocks
        const alicesInboxStream = alicesClient.streams.get(alicesUserInboxStreamId)
        expect(alicesInboxStream).toBeDefined()

        await waitFor(() => {
            const miniblockInfo = alicesInboxStream!.view.miniblockInfo
            log('Current miniblock info:', miniblockInfo)
            // We need at least a few miniblocks before trimming makes sense
            expect(miniblockInfo).toBeDefined()
            expect(miniblockInfo!.max).toBeGreaterThan(2n)
        })

        const miniblockInfoBeforeTrim = alicesInboxStream!.view.miniblockInfo!
        log('Miniblock info before trim:', {
            min: miniblockInfoBeforeTrim.min.toString(),
            max: miniblockInfoBeforeTrim.max.toString(),
        })

        // Calculate a trim point - trim away the first half of miniblocks
        // We need to keep at least some miniblocks, so trim to around midpoint
        const trimToMiniblock = Number(miniblockInfoBeforeTrim.max / 2n)
        expect(trimToMiniblock).toBeGreaterThan(1) // Ensure we have something to trim

        log('Trimming stream to miniblock:', trimToMiniblock)

        // Call debug RPC to force stream trimming
        await alicesClient.rpcClient.info({
            debug: ['force_trim_stream', alicesUserInboxStreamId, trimToMiniblock.toString()],
        })

        log('Stream trimmed successfully')

        // Now test getMiniblocks for a range that was trimmed (should fail or return empty)
        // Request miniblocks from 1 to trimPoint (these should be trimmed)
        const trimmedFromInclusive = 1n
        const trimmedToExclusive = BigInt(trimToMiniblock)

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

        // The trimmed range should return no miniblocks or indicate terminus
        // since those miniblocks have been deleted
        expect(trimmedResult.miniblocks.length).toBe(0)
        expect(trimmedResult.terminus).toBe(true)

        // Now test getMiniblocks for the valid range (after trim point)
        const validFromInclusive = BigInt(trimToMiniblock)
        const validToExclusive = miniblockInfoBeforeTrim.max + 1n

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

        // The valid range should return miniblocks
        expect(validResult.miniblocks.length).toBeGreaterThan(0)

        // Verify the miniblocks are in the expected range (>= trimPoint)
        for (const mb of validResult.miniblocks) {
            expect(mb.header.miniblockNum).toBeGreaterThanOrEqual(validFromInclusive)
            expect(mb.header.miniblockNum).toBeLessThan(validToExclusive)
        }

        log('userInboxStreamTrimmingTest completed successfully')
    })
})
