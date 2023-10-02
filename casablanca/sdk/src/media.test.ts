import { makeTestClient } from './util.test'
import { Client } from './client'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'

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

        const { streamId } = await bobsClient.createMediaStream(spaceId, channelId, chunkCount)
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

    test('spaceNeedsToExistBeforeCreatingMediaStream', async () => {
        const nonExistentSpaceId = makeSpaceStreamId('space-' + genId())
        const nonExistentChannelId = makeChannelStreamId('channel-' + genId())
        await expect(
            bobsClient.createMediaStream(nonExistentSpaceId, nonExistentChannelId, 10),
        ).toReject()
    })

    test('channelNeedsToExistBeforeCreatingMediaStream', async () => {
        const spaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(spaceId)).toResolve()
        const nonExistentChannelId = makeChannelStreamId('channel-' + genId())
        await expect(bobsClient.createMediaStream(spaceId, nonExistentChannelId, 10)).toReject()
    })
})
