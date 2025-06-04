/**
 * @group main
 */

import { isEncryptedData, makeTestClient, makeUniqueSpaceStreamId, waitFor } from '../testUtils'
import { Client } from '../../client'
import { dlog } from '@towns-protocol/dlog'
import { AES_GCM_DERIVED_ALGORITHM } from '@towns-protocol/encryption'
import { makeUniqueChannelStreamId, makeUniqueMediaStreamId, streamIdToBytes } from '../../id'
import { ChunkedMedia, MediaInfoSchema, MembershipOp, PlainMessage } from '@towns-protocol/proto'
import { deriveKeyAndIV } from '../../crypto_utils'
import { nanoid } from 'nanoid'
import { create } from '@bufbuild/protobuf'
import { unpackStream } from '../../sign'

const log = dlog('csb:test')

describe('spaceTests', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.initializeUser()
        bobsClient.startSync()

        alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('bobKicksAlice', async () => {
        log('bobKicksAlice')

        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, 'name', 'topic', channelId),
        ).resolves.not.toThrow()

        await expect(alicesClient.joinStream(spaceId)).resolves.not.toThrow()
        await expect(alicesClient.joinStream(channelId)).resolves.not.toThrow()

        const userStreamView = alicesClient.stream(alicesClient.userStreamId!)!.view
        await waitFor(() => {
            expect(userStreamView.userContent.getMembership(spaceId)?.op).toBe(MembershipOp.SO_JOIN)
            expect(userStreamView.userContent.getMembership(channelId)?.op).toBe(
                MembershipOp.SO_JOIN,
            )
        })

        // Bob can kick Alice
        await expect(bobsClient.removeUser(spaceId, alicesClient.userId)).resolves.not.toThrow()

        // Alice is no longer a member of the space or channel
        await waitFor(() => {
            expect(userStreamView.userContent.getMembership(spaceId)?.op).toBe(
                MembershipOp.SO_LEAVE,
            )
            expect(userStreamView.userContent.getMembership(channelId)?.op).toBe(
                MembershipOp.SO_LEAVE,
            )
        })
    })

    test('channelMetadata', async () => {
        log('channelMetadata')
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()
        const spaceStream = await bobsClient.waitForStream(spaceId)

        // assert assumptions
        expect(spaceStream).toBeDefined()

        // create a new channel
        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, 'name', 'topic', channelId),
        ).resolves.not.toThrow()

        // our space channels metadata should reflect the new channel
        await waitFor(() => {
            expect(spaceStream.view.spaceContent.spaceChannelsMetadata.get(channelId)).toBeDefined()
            expect(
                spaceStream.view.spaceContent.spaceChannelsMetadata.get(channelId)
                    ?.updatedAtEventNum,
            ).toBeGreaterThan(0)
        })

        // save off existing updated at
        const prevUpdatedAt =
            spaceStream.view.spaceContent.spaceChannelsMetadata.get(channelId)!.updatedAtEventNum

        // make a snapshot
        await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

        // the new snapshot should have the new data
        await waitFor(async () => {
            // fetch the raw stream with new snapshot
            const response = await bobsClient.rpcClient.getStream({
                streamId: streamIdToBytes(spaceId),
            })
            const stream = await unpackStream(response.stream, {
                disableHashValidation: true,
                disableSignatureValidation: true,
            })
            const snapshot = stream.snapshot
            if (snapshot?.content.case !== 'spaceContent') {
                throw new Error('snapshot is not a space content')
            }
            expect(
                snapshot.content.value.channels.length,
                'channelMetadata: pre-update bobsClient snapshot.channels.length',
            ).toBe(1)
            expect(snapshot.content.value.channels[0].updatedAtEventNum).toBe(prevUpdatedAt)
        })

        // update the channel metadata
        await bobsClient.updateChannel(spaceId, channelId, '', '')

        // see the metadata update
        await waitFor(() => {
            expect(spaceStream.view.spaceContent.spaceChannelsMetadata.get(channelId)).toBeDefined()
            expect(
                spaceStream.view.spaceContent.spaceChannelsMetadata.get(channelId)
                    ?.updatedAtEventNum,
            ).toBeGreaterThan(prevUpdatedAt)
        })

        // make a miniblock
        await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

        // see new snapshot should have the new data
        await waitFor(async () => {
            // fetch the raw stream with new snapshot
            const response = await bobsClient.rpcClient.getStream({
                streamId: streamIdToBytes(spaceId),
            })
            const stream = await unpackStream(response.stream, {
                disableHashValidation: true,
                disableSignatureValidation: true,
            })
            const snapshot = stream.snapshot
            if (snapshot?.content.case !== 'spaceContent') {
                throw new Error('snapshot is not a space content')
            }
            expect(
                snapshot.content.value.channels.length,
                'channelMetadata: post-update bobsClient snapshot.channels.length',
            ).toBe(1)
            expect(snapshot.content.value.channels[0].updatedAtEventNum).toBeGreaterThan(
                prevUpdatedAt,
            )
        })
    })

    test('spaceImage', async () => {
        const spaceImageUpdatedCounter = {
            count: 0,
        }
        function spaceImageUpdated(_spaceId: string) {
            spaceImageUpdatedCounter.count++
        }
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()
        const spaceStream = await bobsClient.waitForStream(spaceId)

        spaceStream.on('spaceImageUpdated', spaceImageUpdated)

        // make a space image event
        const mediaStreamId = makeUniqueMediaStreamId()
        const image = create(MediaInfoSchema, {
            mimetype: 'image/png',
            filename: 'bob-1.png',
        })
        const { key, iv } = await deriveKeyAndIV(nanoid(128)) // if in browser please use window.crypto.subtle.generateKey
        const chunkedMediaInfo = {
            info: image,
            streamId: mediaStreamId,
            encryption: {
                case: 'aesgcm',
                value: { secretKey: key, iv },
            },
            thumbnail: undefined,
        } satisfies PlainMessage<ChunkedMedia>

        await bobsClient.setSpaceImage(spaceId, chunkedMediaInfo)

        // make a snapshot
        await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

        // see the space image in the snapshot
        await waitFor(async () => {
            // fetch the raw stream with new snapshot
            const response = await bobsClient.rpcClient.getStream({
                streamId: streamIdToBytes(spaceId),
            })
            const stream = await unpackStream(response.stream, {
                disableHashValidation: true,
                disableSignatureValidation: true,
            })
            const snapshot = stream.snapshot

            if (snapshot?.content.case !== 'spaceContent') {
                throw new Error('snapshot is not a space content')
            }
            expect(snapshot.content.value.spaceImage).toBeDefined()
            expect(snapshot.content.value.spaceImage?.data).toBeDefined()
        })

        await waitFor(() => {
            expect(
                spaceImageUpdatedCounter.count,
                'spaceImage: spaceImageUpdatedCounter.count',
            ).toBe(1)
        })

        // decrypt the snapshot and assert the image values
        // fetch the raw stream with new snapshot
        const response = await bobsClient.rpcClient.getStream({
            streamId: streamIdToBytes(spaceId),
        })
        const stream = await unpackStream(response.stream, {
            disableHashValidation: true,
            disableSignatureValidation: true,
        })
        const snapshot = stream.snapshot
        const encryptedData =
            snapshot?.content.case === 'spaceContent'
                ? snapshot.content.value.spaceImage?.data
                : undefined
        expect(
            encryptedData !== undefined &&
                isEncryptedData(encryptedData) &&
                encryptedData.algorithm === AES_GCM_DERIVED_ALGORITHM,
        ).toBe(true)
        const decrypted = await spaceStream.view.spaceContent.getSpaceImage()
        expect(
            decrypted !== undefined &&
                decrypted.info?.mimetype === image.mimetype &&
                decrypted.info?.filename === image.filename &&
                decrypted.encryption.case === 'aesgcm' &&
                decrypted.encryption.value.secretKey !== undefined,
        ).toBe(true)

        // make another space image event
        const mediaStreamId2 = makeUniqueMediaStreamId()
        const image2 = create(MediaInfoSchema, {
            mimetype: 'image/jpg',
            filename: 'bob-2.jpg',
        })
        const chunkedMediaInfo2 = {
            info: image2,
            streamId: mediaStreamId2,
            encryption: {
                case: 'aesgcm',
                value: { secretKey: key, iv },
            },
            thumbnail: undefined,
        } satisfies PlainMessage<ChunkedMedia>

        await bobsClient.setSpaceImage(spaceId, chunkedMediaInfo2)

        // make a snapshot
        await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

        // see the space image in the snapshot
        await waitFor(async () => {
            // fetch the raw stream with new snapshot
            const response = await bobsClient.rpcClient.getStream({
                streamId: streamIdToBytes(spaceId),
            })
            const stream = await unpackStream(response.stream, {
                disableHashValidation: true,
                disableSignatureValidation: true,
            })
            const snapshot = stream.snapshot
            if (snapshot?.content.case !== 'spaceContent') {
                throw new Error('snapshot is not a space content')
            }
            expect(snapshot.content.value.spaceImage).toBeDefined()
            expect(snapshot.content.value.spaceImage?.data).toBeDefined()
        })

        // decrypt the snapshot and assert the image values
        const spaceImage = await spaceStream.view.spaceContent.getSpaceImage()
        expect(spaceImage).toBeDefined()
        expect(spaceImage?.info?.mimetype).toBe(image2.mimetype)
        expect(spaceImage?.info?.filename).toBe(image2.filename)
        expect(spaceImage?.encryption.case).toBe('aesgcm')
        if (spaceImage?.encryption.case !== 'aesgcm') {
            throw new Error('space image encryption is not aesgcm') // to compile
        }
        expect(spaceImage?.encryption.value.secretKey).toBeDefined()
        expect(spaceImageUpdatedCounter.count).toBe(2)
    })
})
