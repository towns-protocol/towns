/**
 * @group main
 */

import { makeTestClient } from './util.test'
import { Client } from './client'
import { genId, makeChannelStreamId, makeDMStreamId, makeSpaceStreamId } from './id'

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
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        await expect(bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId)).toResolve()

        return await bobsClient.createMediaStream(channelId, spaceId, chunkCount)
    }

    test('clientCanCreateMediaStream', async () => {
        await expect(bobCreateMediaStream(10)).toResolve()
    })

    test('clientCanSendMediaPayload', async () => {
        const mediaStreamInfo = await bobCreateMediaStream(10)

        const chunk = new Uint8Array(100)
        for (let i = 0; i < 10; i++) {
            const result = await bobsClient.sendMediaPayload(
                mediaStreamInfo.streamId,
                chunk,
                i,
                mediaStreamInfo.prevMiniblockHash,
            )
            mediaStreamInfo.prevMiniblockHash = result.prevMiniblockHash
        }
    })

    test('chunkIndexNeedsToBeWithinBounds', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, -1, result.prevMiniblockHash),
        ).toReject()
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 10, result.prevMiniblockHash),
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
        const nonExistentSpaceId = makeSpaceStreamId(genId())
        const nonExistentChannelId = makeChannelStreamId(genId())
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
})
