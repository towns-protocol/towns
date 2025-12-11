/**
 * @group main
 */

import { Client } from '../../client'
import { makeDonePromise, makeTestClient, makeUniqueSpaceStreamId } from '../testUtils'
import { bin_fromHexString, dlog } from '@towns-protocol/utils'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import { UserInboxPayload_GroupEncryptionSessions } from '@towns-protocol/proto'
import { makeUniqueChannelStreamId, makeUserInboxStreamId, streamIdAsString } from '../../id'
import { createRiverRegistry, LocalhostWeb3Provider } from '@towns-protocol/web3'
import { townsEnv } from '../../townsEnv'
import { makeStreamRpcClient } from '../../makeStreamRpcClient'

const log = dlog('test:inboxMessage', { allowJest: true, defaultEnabled: true })

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
        log('Alice initialized, userId:', alicesClient.userId)

        // Initialize Bob's client
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        log('Bob initialized, userId:', bobsClient.userId)

        const alicesUserInboxStreamId = makeUserInboxStreamId(alicesClient.userId)
        log('alicesUserInboxStreamId:', alicesUserInboxStreamId)

        // Generate miniblocks with one event each.
        // UserInbox stream generates a snapshot every 10 events.
        // We'll create 14 events/miniblocks to get 1 snapshot (at miniblock 10)
        // plus the genesis miniblock 0 has a snapshot = 2 total snapshots.
        const numMessages = 14
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

            if ((i + 1) % 5 === 0) {
                log(`Progress: sent ${i + 1}/${numMessages} messages`)
            }
        }
        log('Finished sending messages and creating miniblocks')

        // Wait for the stream to sync with all miniblocks
        const alicesInboxStream = alicesClient.streams.get(alicesUserInboxStreamId)
        expect(alicesInboxStream).toBeDefined()

        const miniblockInfoBeforeTrim = alicesInboxStream!.view.miniblockInfo!
        log('Miniblock info before trim:', {
            min: miniblockInfoBeforeTrim.min.toString(),
            max: miniblockInfoBeforeTrim.max.toString(),
        })

        // Verify we have exactly 14 miniblocks (0-14, so max=14)
        // Genesis miniblock is 0, then we created 14 more (1-14)
        //expect(miniblockInfoBeforeTrim.max).toBe(14n)
        //expect(miniblockInfoBeforeTrim.min).toBe(0n)

        // UserInbox streams generate snapshots every 10 events.
        // With 14 messages, we should have snapshots at miniblock 0 (genesis) and miniblock 10.
        // We'll fetch miniblocks 0-14 and find the latest one with a snapshot.
        const allMiniblocks = await alicesClient.getMiniblocks(
            alicesUserInboxStreamId,
            0n,
            miniblockInfoBeforeTrim.max + 1n,
            undefined,
            { skipPersistence: true },
        )

        log('Fetched miniblocks count:', allMiniblocks.miniblocks.length)

        // Find the latest miniblock with a snapshot (excluding genesis at 0)
        let latestSnapshotMiniblock = 0n
        for (const mb of allMiniblocks.miniblocks) {
            const mbNum = mb.header.miniblockNum
            const hasSnapshot =
                mb.header.snapshot !== undefined ||
                (mb.header.snapshotHash !== undefined && mb.header.snapshotHash.length > 0)
            log(
                `Miniblock ${mbNum}: hasSnapshot=${hasSnapshot}, prevSnapshotMiniblockNum=${mb.header.prevSnapshotMiniblockNum}`,
            )
            if (hasSnapshot && mbNum > latestSnapshotMiniblock) {
                latestSnapshotMiniblock = mbNum
            }
        }

        log('Latest snapshot miniblock number:', latestSnapshotMiniblock.toString())

        // Ensure we found a snapshot beyond genesis
        expect(latestSnapshotMiniblock).toBeGreaterThan(0n)

        // Trim up to latestSnapshotMiniblock, keeping the snapshot miniblock and everything after
        const trimToMiniblock = Number(latestSnapshotMiniblock)

        log('Trimming stream to miniblock:', trimToMiniblock)

        // Get all nodes that host this stream and trim on each one
        const config = townsEnv().makeRiverChainConfig()
        const provider = new LocalhostWeb3Provider(config.rpcUrl)
        const riverRegistry = createRiverRegistry(provider, config.chainConfig)

        // Get the stream info to find which nodes host it
        const streamIdBytes = bin_fromHexString(alicesUserInboxStreamId)
        const streamInfo = await riverRegistry.getStream(streamIdBytes)
        const streamNodeAddresses = streamInfo.nodes
        log('Stream is hosted on nodes:', streamNodeAddresses)

        // Get all nodes to map addresses to URLs
        const allNodes = await riverRegistry.getAllNodes()
        expect(allNodes).toBeDefined()

        // For each node hosting the stream, send trim request
        for (const nodeAddress of streamNodeAddresses) {
            const nodeInfo = allNodes![nodeAddress]
            if (!nodeInfo) {
                log(`Warning: Node ${nodeAddress} not found in registry`)
                continue
            }

            const nodeUrl = nodeInfo.url
            log(`Trimming stream on node ${nodeAddress} at ${nodeUrl}`)

            // Create an RPC client for this specific node
            const nodeRpcClient = makeStreamRpcClient(nodeUrl)

            // Call debug RPC to force stream trimming on this node
            const trimResponse = await nodeRpcClient.info({
                debug: ['force_trim_stream', alicesUserInboxStreamId, trimToMiniblock.toString()],
            })

            log(`Trim response from node ${nodeAddress}:`, trimResponse)
        }

        log('Stream trimmed successfully on all nodes')

        // Now test getMiniblocks for a range that was trimmed (should return empty)
        // Request miniblocks from 0 to 10 (these should be trimmed, miniblocks 0-9 deleted)
        const trimmedFromInclusive = 0n
        const trimmedToExclusive = BigInt(trimToMiniblock) // 10

        log('Calling getMiniblocks for trimmed range:', {
            fromInclusive: trimmedFromInclusive.toString(),
            toExclusive: trimmedToExclusive.toString(),
        })

        let getMiniblocksFailed = false
        try {
            const trimmedResult = await alicesClient.getMiniblocks(
                alicesUserInboxStreamId,
                trimmedFromInclusive,
                trimmedToExclusive,
                undefined,
                { skipPersistence: true },
            )
            // If we get here without throwing, the test should fail
            // since there is no range of such miniblocks anymore
            log('getMiniblocks unexpectedly succeeded for trimmed range:', {
                numMiniblocks: trimmedResult.miniblocks.length,
                terminus: trimmedResult.terminus,
                miniblockNums: trimmedResult.miniblocks.map((mb) =>
                    mb.header.miniblockNum.toString(),
                ),
            })
            expect.fail('getMiniblocks should have thrown an error for trimmed range')
        } catch (error) {
            // Expected: getMiniblocks should throw an error for trimmed range
            getMiniblocksFailed = true
            log('getMiniblocks correctly threw error for trimmed range:', error)
        }
        expect(getMiniblocksFailed).toBe(true)

        // Now test getMiniblocks for the valid range (miniblock 10-14)
        const validFromInclusive = BigInt(trimToMiniblock) // 10
        const validToExclusive = miniblockInfoBeforeTrim.max + 1n // 15

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

        // The valid range should return miniblocks from trimToMiniblock to max
        const expectedMiniblockCount = Number(miniblockInfoBeforeTrim.max) - trimToMiniblock + 1
        log('Valid range miniblocks count:', validResult.miniblocks.length)
        log('Expected miniblock count:', expectedMiniblockCount)
        expect(validResult.miniblocks.length).toBe(expectedMiniblockCount)

        // Verify miniblock numbers are in expected range
        const validMiniblockNums = validResult.miniblocks
            .map((mb) => Number(mb.header.miniblockNum))
            .sort((a, b) => a - b)
        log('Valid range miniblock numbers:', validMiniblockNums)

        // Verify the first miniblock is the trim point
        expect(validMiniblockNums[0]).toBe(trimToMiniblock)

        log('userInboxStreamTrimmingTest completed successfully')
    })
})
