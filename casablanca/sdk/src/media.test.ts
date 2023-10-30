import { makeTestClient } from './util.test'
import { Client } from './client'
import { genId, makeChannelStreamId, makeDMStreamId, makeSpaceStreamId } from './id'

describe('mediaTests', () => {
    let bobsClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.createNewUser()
        await bobsClient.initCrypto()
        await bobsClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
    })

    async function bobCreateMediaStream(chunkCount: number): Promise<string> {
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        await expect(bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId)).toResolve()

        const { streamId } = await bobsClient.createMediaStream(channelId, chunkCount)
        return streamId
    }

    test('clientCanCreateMediaStream', async () => {
        await expect(bobCreateMediaStream(10)).toResolve()
    })

    test('clientCanSendMediaPayload', async () => {
        const mediaStreamId = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)
        for (let i = 0; i < 10; i++) {
            await expect(bobsClient.sendMediaPayload(mediaStreamId, chunk, i)).toResolve()
        }
    })

    test('chunkIndexNeedsToBeWithinBounds', async () => {
        const mediaStreamId = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)
        await expect(bobsClient.sendMediaPayload(mediaStreamId, chunk, -1)).toReject()
        await expect(bobsClient.sendMediaPayload(mediaStreamId, chunk, 10)).toReject()
    })

    test('chunkSizeCanBeAtLimit', async () => {
        const mediaStreamId = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500000)
        await expect(bobsClient.sendMediaPayload(mediaStreamId, chunk, 0)).toResolve()
    })

    test('chunkSizeNeedsToBeWithinLimit', async () => {
        const mediaStreamId = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500001)
        await expect(bobsClient.sendMediaPayload(mediaStreamId, chunk, 0)).toReject()
    })

    test('chunkCountNeedsToBeWithinLimit', async () => {
        await expect(bobCreateMediaStream(11)).toReject()
    })

    test('clientCanOnlyPostToTheirOwnMediaStream', async () => {
        const mediaStreamId = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)

        const alicesClient = await makeTestClient()
        await alicesClient.createNewUser()
        await alicesClient.initCrypto()
        await alicesClient.startSync()

        // @ts-ignore
        await alicesClient.initStream(mediaStreamId)
        await expect(alicesClient.sendMediaPayload(mediaStreamId, chunk, 5)).toReject()
        await alicesClient.stop()
    })

    test('channelNeedsToExistBeforeCreatingMediaStream', async () => {
        const nonExistentChannelId = makeChannelStreamId('channel-' + genId())
        await expect(bobsClient.createMediaStream(nonExistentChannelId, 10)).toReject()
    })

    test('dmChannelNeedsToExistBeforeCreatingMediaStream', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.createNewUser()
        await alicesClient.initCrypto()
        await alicesClient.startSync()

        const nonExistentChannelId = makeDMStreamId(bobsClient.userId, alicesClient.userId)
        await expect(bobsClient.createMediaStream(nonExistentChannelId, 10)).toReject()
        await alicesClient.stop()
    })

    test('userCanUploadMediaToDmIfMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.createNewUser()
        await alicesClient.initCrypto()
        await alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.createMediaStream(streamId, 10)).toResolve()
        await expect(alicesClient.createMediaStream(streamId, 10)).toResolve()
        await alicesClient.stop()
    })

    test('userCannotUploadMediaToDmUnlessMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.createNewUser()
        await alicesClient.initCrypto()
        await alicesClient.startSync()

        const charliesClient = await makeTestClient()
        await charliesClient.createNewUser()
        await charliesClient.initCrypto()
        await charliesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)

        await expect(charliesClient.createMediaStream(streamId, 10)).toReject()
        await alicesClient.stop()
        await charliesClient.stop()
    })
})
