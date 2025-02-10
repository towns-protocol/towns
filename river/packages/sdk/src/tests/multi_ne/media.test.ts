/**
 * @group main
 */

import { makeTestClient, makeUniqueSpaceStreamId } from '../testUtils'
import { Client } from '../../client'
import { makeUniqueChannelStreamId, makeDMStreamId, streamIdAsString } from '../../id'
import { CreationCookie, InfoRequest } from '@river-build/proto'
import { deriveKeyAndIV, encryptAESGCM } from '../../crypto_utils'

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
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId),
        ).resolves.not.toThrow()

        return bobsClient.createMediaStream(channelId, spaceId, undefined, chunkCount)
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

    async function bobSendEncryptedMediaPayload(
        streamId: string,
        data: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array,
        prevMiniblockHash: Uint8Array,
    ): Promise<Uint8Array> {
        let prevHash = prevMiniblockHash
        const { ciphertext } = await encryptAESGCM(data, key, iv)
        const result = await bobsClient.sendMediaPayload(streamId, ciphertext, 0, prevHash)
        prevHash = result.prevMiniblockHash
        return prevHash
    }

    function createTestMediaChunks(chunks: number): Uint8Array {
        const data: Uint8Array = new Uint8Array(10 * chunks)
        for (let i = 0; i < chunks; i++) {
            const start = i * 10
            const end = start + 10
            data.fill(i, start, end)
        }
        return data
    }

    async function bobCreateSpaceMediaStream(
        spaceId: string,
        chunkCount: number,
    ): Promise<{ streamId: string; prevMiniblockHash: Uint8Array }> {
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()
        const mediaInfo = await bobsClient.createMediaStream(
            undefined,
            spaceId,
            undefined,
            chunkCount,
        )
        return mediaInfo
    }

    test('clientCanCreateMediaStream', async () => {
        await expect(bobCreateMediaStream(10)).resolves.not.toThrow()
    })

    test('clientCanCreateSpaceMediaStream', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobCreateSpaceMediaStream(spaceId, 10)).resolves.not.toThrow()
    })

    test('clientCanSendMediaPayload', async () => {
        const mediaStreamInfo = await bobCreateMediaStream(10)
        await bobSendMediaPayloads(mediaStreamInfo.streamId, 10, mediaStreamInfo.prevMiniblockHash)
    })

    test('clientCanSendSpaceMediaPayload', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const mediaStreamInfo = await bobCreateSpaceMediaStream(spaceId, 10)
        await expect(
            bobSendMediaPayloads(mediaStreamInfo.streamId, 10, mediaStreamInfo.prevMiniblockHash),
        ).resolves.not.toThrow()
    })

    test('clientCanSendEncryptedDerivedAesGmPayload', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const mediaStreamInfo = await bobCreateSpaceMediaStream(spaceId, 3)
        const { iv, key } = await deriveKeyAndIV(spaceId)
        const data = createTestMediaChunks(2)
        await expect(
            bobSendEncryptedMediaPayload(
                mediaStreamInfo.streamId,
                data,
                key,
                iv,
                mediaStreamInfo.prevMiniblockHash,
            ),
        ).resolves.not.toThrow()
    })

    test('clientCanDownloadEncryptedDerivedAesGmPayload', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const mediaStreamInfo = await bobCreateSpaceMediaStream(spaceId, 2)
        const { iv, key } = await deriveKeyAndIV(spaceId)
        const data = createTestMediaChunks(2)
        await bobSendEncryptedMediaPayload(
            mediaStreamInfo.streamId,
            data,
            key,
            iv,
            mediaStreamInfo.prevMiniblockHash,
        )
        const decryptedChunks = await bobsClient.getMediaPayload(mediaStreamInfo.streamId, key, iv)
        expect(decryptedChunks).toEqual(data)
    })

    test('chunkIndexNeedsToBeWithinBounds', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, -1, result.prevMiniblockHash),
        ).rejects.toThrow()
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 11, result.prevMiniblockHash),
        ).rejects.toThrow()
    })

    test('chunkSizeCanBeAtLimit', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500000)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 0, result.prevMiniblockHash),
        ).resolves.not.toThrow()
    })

    test('chunkSizeNeedsToBeWithinLimit', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500001)
        await expect(
            bobsClient.sendMediaPayload(result.streamId, chunk, 0, result.prevMiniblockHash),
        ).rejects.toThrow()
    })

    test('chunkCountNeedsToBeWithinLimit', async () => {
        await expect(bobCreateMediaStream(11)).rejects.toThrow()
    })

    test('clientCanOnlyPostToTheirOwnMediaStream', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)

        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        await expect(
            alicesClient.sendMediaPayload(result.streamId, chunk, 5, result.prevMiniblockHash),
        ).rejects.toThrow()
        await alicesClient.stop()
    })

    test('clientCanOnlyPostToTheirOwnPublicMediaStream', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const result = await bobCreateSpaceMediaStream(spaceId, 10)
        const chunk = new Uint8Array(100)

        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        await expect(
            alicesClient.sendMediaPayload(result.streamId, chunk, 5, result.prevMiniblockHash),
        ).rejects.toThrow()
        await alicesClient.stop()
    })

    test('channelNeedsToExistBeforeCreatingMediaStream', async () => {
        const nonExistentSpaceId = makeUniqueSpaceStreamId()
        const nonExistentChannelId = makeUniqueChannelStreamId(nonExistentSpaceId)
        await expect(
            bobsClient.createMediaStream(nonExistentChannelId, nonExistentSpaceId, undefined, 10),
        ).rejects.toThrow()
    })

    test('dmChannelNeedsToExistBeforeCreatingMediaStream', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const nonExistentChannelId = makeDMStreamId(bobsClient.userId, alicesClient.userId)
        await expect(
            bobsClient.createMediaStream(nonExistentChannelId, undefined, undefined, 10),
        ).rejects.toThrow()
        await alicesClient.stop()
    })

    test('userCanUploadMediaToDmIfMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(
            bobsClient.createMediaStream(streamId, undefined, undefined, 10),
        ).resolves.not.toThrow()
        await expect(
            alicesClient.createMediaStream(streamId, undefined, undefined, 10),
        ).resolves.not.toThrow()
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
        await expect(
            bobsClient.createMediaStream(streamId, undefined, undefined, 10),
        ).resolves.not.toThrow()
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

        await expect(
            charliesClient.createMediaStream(streamId, undefined, undefined, 10),
        ).rejects.toThrow()
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

    test('userMediaStream', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()
        await expect(
            alicesClient.createMediaStream(undefined, undefined, alicesClient.userId, 10),
        ).resolves.not.toThrow()
    })
})

describe('mediaTestsNew', () => {
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
    ): Promise<{ creationCookie: CreationCookie }> {
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId),
        ).resolves.not.toThrow()

        return bobsClient.createMediaStreamNew(channelId, spaceId, undefined, chunkCount)
    }

    async function bobSendMediaPayloads(
        creationCookie: CreationCookie,
        chunks: number,
    ): Promise<CreationCookie> {
        let cc: CreationCookie = new CreationCookie(creationCookie)
        for (let i = 0; i < chunks; i++) {
            const chunk = new Uint8Array(100)
            // Create novel chunk content for testing purposes
            chunk.fill(i, 0, 100)
            const last = i == chunks - 1
            const result = await bobsClient.sendMediaPayloadNew(cc, last, chunk, i)
            cc = new CreationCookie({
                ...cc,
                prevMiniblockHash: new Uint8Array(result.creationCookie.prevMiniblockHash),
                miniblockNum: result.creationCookie.miniblockNum,
            })
        }
        return cc
    }

    async function bobSendEncryptedMediaPayload(
        creationCookie: CreationCookie,
        last: boolean,
        data: Uint8Array,
        key: Uint8Array,
        iv: Uint8Array,
    ): Promise<CreationCookie> {
        const { ciphertext } = await encryptAESGCM(data, key, iv)
        const result = await bobsClient.sendMediaPayloadNew(creationCookie, last, ciphertext, 0)
        return result.creationCookie
    }

    function createTestMediaChunks(chunks: number): Uint8Array {
        const data: Uint8Array = new Uint8Array(10 * chunks)
        for (let i = 0; i < chunks; i++) {
            const start = i * 10
            const end = start + 10
            data.fill(i, start, end)
        }
        return data
    }

    async function bobCreateSpaceMediaStream(
        spaceId: string,
        chunkCount: number,
    ): Promise<{ creationCookie: CreationCookie }> {
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()
        const mediaInfo = await bobsClient.createMediaStreamNew(
            undefined,
            spaceId,
            undefined,
            chunkCount,
        )
        return mediaInfo
    }

    test('clientCanCreateMediaStream', async () => {
        await expect(bobCreateMediaStream(10)).resolves.not.toThrow()
    })

    test('clientCanCreateSpaceMediaStream', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobCreateSpaceMediaStream(spaceId, 10)).resolves.not.toThrow()
    })

    test('clientCanSendMediaPayload', async () => {
        const mediaStreamInfo = await bobCreateMediaStream(10)
        await bobSendMediaPayloads(mediaStreamInfo.creationCookie, 10)
    })

    test('clientCanSendSpaceMediaPayload', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const mediaStreamInfo = await bobCreateSpaceMediaStream(spaceId, 10)
        await expect(
            bobSendMediaPayloads(mediaStreamInfo.creationCookie, 10),
        ).resolves.not.toThrow()
    })

    test('clientCanSendEncryptedDerivedAesGmPayload', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const mediaStreamInfo = await bobCreateSpaceMediaStream(spaceId, 3)
        const { iv, key } = await deriveKeyAndIV(spaceId)
        const data = createTestMediaChunks(2)
        await expect(
            bobSendEncryptedMediaPayload(mediaStreamInfo.creationCookie, false, data, key, iv),
        ).resolves.not.toThrow()
    })

    test('clientCanDownloadEncryptedDerivedAesGmPayload', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const mediaStreamInfo = await bobCreateSpaceMediaStream(spaceId, 2)
        let creationCookie = mediaStreamInfo.creationCookie
        const { iv, key } = await deriveKeyAndIV(spaceId)
        const data = createTestMediaChunks(2)
        creationCookie = await bobSendEncryptedMediaPayload(creationCookie, false, data, key, iv)
        await bobSendEncryptedMediaPayload(creationCookie, true, data, key, iv)
        const decryptedChunks = await bobsClient.getMediaPayload(
            streamIdAsString(creationCookie.streamId),
            key,
            iv,
        )
        expect(decryptedChunks).toEqual(data)
    })

    test('chunkIndexNeedsToBeWithinBounds', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)
        await expect(
            bobsClient.sendMediaPayloadNew(result.creationCookie, false, chunk, -1),
        ).rejects.toThrow()
        await expect(
            bobsClient.sendMediaPayloadNew(result.creationCookie, false, chunk, 11),
        ).rejects.toThrow()
    })

    test('chunkSizeCanBeAtLimit', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500000)
        await expect(
            bobsClient.sendMediaPayloadNew(result.creationCookie, false, chunk, 0),
        ).resolves.not.toThrow()
    })

    test('chunkSizeNeedsToBeWithinLimit', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(500001)
        await expect(
            bobsClient.sendMediaPayloadNew(result.creationCookie, false, chunk, 0),
        ).rejects.toThrow()
    })

    test('chunkCountNeedsToBeWithinLimit', async () => {
        await expect(bobCreateMediaStream(11)).rejects.toThrow()
    })

    test('clientCanOnlyPostToTheirOwnMediaStream', async () => {
        const result = await bobCreateMediaStream(10)
        const chunk = new Uint8Array(100)

        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        await expect(
            alicesClient.sendMediaPayloadNew(result.creationCookie, false, chunk, 5),
        ).rejects.toThrow()
        await alicesClient.stop()
    })

    test('clientCanOnlyPostToTheirOwnPublicMediaStream', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const result = await bobCreateSpaceMediaStream(spaceId, 10)
        const chunk = new Uint8Array(100)

        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        await expect(
            alicesClient.sendMediaPayloadNew(result.creationCookie, false, chunk, 5),
        ).rejects.toThrow()
        await alicesClient.stop()
    })

    test('channelNeedsToExistBeforeCreatingMediaStream', async () => {
        const nonExistentSpaceId = makeUniqueSpaceStreamId()
        const nonExistentChannelId = makeUniqueChannelStreamId(nonExistentSpaceId)
        await expect(
            bobsClient.createMediaStream(nonExistentChannelId, nonExistentSpaceId, undefined, 10),
        ).rejects.toThrow()
    })

    test('dmChannelNeedsToExistBeforeCreatingMediaStream', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const nonExistentChannelId = makeDMStreamId(bobsClient.userId, alicesClient.userId)
        await expect(
            bobsClient.createMediaStream(nonExistentChannelId, undefined, undefined, 10),
        ).rejects.toThrow()
        await alicesClient.stop()
    })

    test('userCanUploadMediaToDmIfMember', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(
            bobsClient.createMediaStream(streamId, undefined, undefined, 10),
        ).resolves.not.toThrow()
        await expect(
            alicesClient.createMediaStream(streamId, undefined, undefined, 10),
        ).resolves.not.toThrow()
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
        await expect(
            bobsClient.createMediaStream(streamId, undefined, undefined, 10),
        ).resolves.not.toThrow()
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

        await expect(
            charliesClient.createMediaStream(streamId, undefined, undefined, 10),
        ).rejects.toThrow()
        await alicesClient.stop()
        await charliesClient.stop()
    })

    // This test is flaky because there is a bug in GetStreamEx where sometimes the miniblock is not
    // finalized before the client tries to fetch it. This is a known issue, see HNT-5291.
    test.skip('mediaStreamGetStreamEx', async () => {
        const { creationCookie } = await bobCreateMediaStream(10)
        const streamId = streamIdAsString(creationCookie.streamId)
        // Send a series of media chunks
        await bobSendMediaPayloads(creationCookie, 10)
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

    test('userMediaStream', async () => {
        const alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()
        await expect(
            alicesClient.createMediaStream(undefined, undefined, alicesClient.userId, 10),
        ).resolves.not.toThrow()
    })
})
