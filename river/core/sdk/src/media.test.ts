/**
 * @group main
 */

import { makeTestClient, makeUniqueSpaceStreamId } from './util.test'
import { Client } from './client'
import { makeUniqueChannelStreamId, makeDMStreamId } from './id'
import { InfoRequest } from '@river-build/proto'

describe('mediaTests', () => {
    let bobsClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.initializeUser()
        bobsClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
    })

    async function bobCreateMediaStream(
        chunkCount: number,
    ): Promise<{ streamId: string; prevMiniblockHash: Uint8Array }> {
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId)).toResolve()

        return await bobsClient.createMediaStream(channelId, spaceId, chunkCount)
    }

    async function bobSendMediaPayloads(
        streamId: string,
        chunks: number,
        prevMiniblockHash: Uint8Array,
    ): Promise<Uint8Array> {
        let prevHash = prevMiniblockHash
        for (let i = 0; i < chunks; i++) {
            const chunk = new Uint8Array(100)
            // Create novel chunk content for testing purposes
            chunk.fill(i, 0, 100)
            const result = await bobsClient.sendMediaPayload(streamId, chunk, i, prevHash)
            prevHash = result.prevMiniblockHash
        }
        return prevHash
    }

    test('clientCanCreateMediaStream', async () => {
        await expect(bobCreateMediaStream(10)).toResolve()
    })

    test('clientCanSendMediaPayload', async () => {
        const mediaStreamInfo = await bobCreateMediaStream(10)
        await bobSendMediaPayloads(mediaStreamInfo.streamId, 10, mediaStreamInfo.prevMiniblockHash)
    })

    test('chunkIndexNeedsToBeWithinBounds', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, -1, result.prevMiniblockHash),
        ).toReject()
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 11, result.prevMiniblockHash),
        ).toReject()
    })

    test('chunkSizeCanBeAtLimit', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500000)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 0, result.prevMiniblockHash),
        ).toResolve()
    })

    test('chunkSizeNeedsToBeWithinLimit', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500001)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 0, result.prevMiniblockHash),
        ).toReject()
    })

    test('chunkCountNeedsToBeWithinLimit', async () => {
        await expect(bobCreateMediaStream(11)).toReject()
    })

    test('clientCanOnlyPostToTheirOwnMediaStream', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)

        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        await expect(
            alicesClient.sendMediaPayload(result.streamId, chunk, 5, result.prevMiniblockHash),
        ).toReject()
        await alicesClient.stop()
    })

    test('channelNeedsToExistBeforeCreatingMediaStream', async () => {
        const nonExistentSpaceId = makeUniqueSpaceStreamId()
        const nonExistentChannelId = makeUniqueChannelStreamId(nonExistentSpaceId)
        await expect(
            bobsClient.createMediaStream(nonExistentChannelId, nonExistentSpaceId, 10),
        ).toReject()
    })

    test('dmChannelNeedsToExistBeforeCreatingMediaStream', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const nonExistentChannelId = makeDMStreamId(bobsClient.userId, alicesClient.userId)
        await expect(bobsClient.createMediaStream(nonExistentChannelId, undefined, 10)).toReject()
        await alicesClient.stop()
    })

    test('userCanUploadMediaToDmIfMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.createMediaStream(streamId, undefined, 10)).toResolve()
        await expect(alicesClient.createMediaStream(streamId, undefined, 10)).toResolve()
        await alicesClient.stop()
    })

    test('userCanUploadMediaToGdmIfMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const charliesClient = await makeTestClient()
        await charliesClient.initializeUser()
        charliesClient.startSync()

        const { streamId } = await bobsClient.createGDMChannel([
            alicesClient.userId,
            charliesClient.userId,
        ])
        await expect(bobsClient.createMediaStream(streamId, undefined, 10)).toResolve()
        await alicesClient.stop()
        await charliesClient.stop()
    })

    test('userCannotUploadMediaToDmUnlessMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const charliesClient = await makeTestClient()
        await charliesClient.initializeUser()
        charliesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)

        await expect(charliesClient.createMediaStream(streamId, undefined, 10)).toReject()
        await alicesClient.stop()
        await charliesClient.stop()
    })

    // This test is flaky because there is a bug in GetStreamEx where sometimes the miniblock is not
    // finalized before the client tries to fetch it. This is a known issue, see HNT-5291.
    test.skip('mediaStreamGetStreamEx', async () => {
        const { streamId, prevMiniblockHash } = await bobCreateMediaStream(10)
        // Send a series of media chunks
        await bobSendMediaPayloads(streamId, 10, prevMiniblockHash)
        // Force server to flush minipool events into a block
        await bobsClient.rpcClient.info(
            new InfoRequest({
                debug: ['make_miniblock', streamId],
            }),
            { timeoutMs: 10000 },
        )

        // Grab stream from both endpoints
        const stream = await bobsClient.getStream(streamId)
        const streamEx = await bobsClient.getStreamEx(streamId)

        // Assert exact content equality with bobSendMediaPayloads
        expect(streamEx.mediaContent.info).toBeDefined()
        expect(streamEx.mediaContent.info?.chunks.length).toEqual(10)
        for (let i = 0; i < 10; i++) {
            const chunk = new Uint8Array(100)
            chunk.fill(i, 0, 100)
            expect(streamEx.mediaContent.info?.chunks[i]).toBeDefined()
            expect(streamEx.mediaContent.info?.chunks[i]).toEqual(chunk)
        }

        // Assert equality of mediaContent between getStream and getStreamEx
        // use-chunked-media.ts utilizes the tream.mediaContent.info property, so equality here
        // will result in the same behavior in the client app.
        expect(stream.mediaContent).toEqual(streamEx.mediaContent)
    })
})
