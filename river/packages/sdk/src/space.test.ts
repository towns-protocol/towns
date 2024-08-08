/**
 * @group main
 */

import { isEncryptedData, makeTestClient, makeUniqueSpaceStreamId, waitFor } from './util.test'
import { Client } from './client'
import { dlog } from '@river-build/dlog'
import { AES_GCM_DERIVED_ALGORITHM } from '@river-build/encryption'
import {
    contractAddressFromSpaceId,
    makeUniqueChannelStreamId,
    makeUniqueMediaStreamId,
} from './id'
import { MediaInfo, MembershipOp } from '@river-build/proto'

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
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, 'name', 'topic', channelId)).toResolve()

        await expect(alicesClient.joinStream(spaceId)).toResolve()
        await expect(alicesClient.joinStream(channelId)).toResolve()

        const userStreamView = alicesClient.stream(alicesClient.userStreamId!)!.view
        await waitFor(() => {
            expect(userStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(true)
            expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(true)
        })

        // Bob can kick Alice
        await expect(bobsClient.removeUser(spaceId, alicesClient.userId)).toResolve()

        // Alice is no longer a member of the space or channel
        await waitFor(() => {
            expect(userStreamView.userContent.isMember(spaceId, MembershipOp.SO_JOIN)).toBe(false)
            expect(userStreamView.userContent.isMember(channelId, MembershipOp.SO_JOIN)).toBe(false)
        })
    })

    test('channelMetadata', async () => {
        log('channelMetadata')
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).toResolve()
        const spaceStream = await bobsClient.waitForStream(spaceId)

        // assert assumptions
        expect(spaceStream).toBeDefined()
        expect(
            spaceStream.view.snapshot?.content.case === 'spaceContent' &&
                spaceStream.view.snapshot?.content.value.channels.length === 0,
        ).toBe(true)

        // create a new channel
        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, 'name', 'topic', channelId)).toResolve()

        // our space channels metatdata should reflect the new channel
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
        await waitFor(() => {
            expect(
                spaceStream.view.snapshot?.content.case === 'spaceContent' &&
                    spaceStream.view.snapshot.content.value.channels.length === 1 &&
                    spaceStream.view.snapshot.content.value.channels[0].updatedAtEventNum ===
                        prevUpdatedAt,
            ).toBe(true)
        })

        // update the channel metadata
        await bobsClient.updateChannel(spaceId, channelId, '', '')

        // see the metadat update
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
        await waitFor(() => {
            expect(
                spaceStream.view.snapshot?.content.case === 'spaceContent' &&
                    spaceStream.view.snapshot.content.value.channels.length === 1 &&
                    spaceStream.view.snapshot.content.value.channels[0].updatedAtEventNum >
                        prevUpdatedAt,
            ).toBe(true)
        })
    })

    test('spaceImage', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        const spaceContractAddress = contractAddressFromSpaceId(spaceId)
        await expect(bobsClient.createSpace(spaceId)).toResolve()
        const spaceStream = await bobsClient.waitForStream(spaceId)

        // assert assumptions
        expect(spaceStream).toBeDefined()
        expect(
            spaceStream.view.snapshot?.content.case === 'spaceContent' &&
                spaceStream.view.snapshot?.content.value.spaceImage === undefined,
        ).toBe(true)

        // make a space image event
        const mediaStreamId = makeUniqueMediaStreamId()
        const image = new MediaInfo({
            mimetype: 'image/png',
            filename: 'bob-1.png',
        })

        await bobsClient.setSpaceImage(spaceId, mediaStreamId, image)

        // make a snapshot
        await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

        // see the space image in the snapshot
        await waitFor(() => {
            expect(
                spaceStream.view.snapshot?.content.case === 'spaceContent' &&
                    spaceStream.view.snapshot.content.value.spaceImage !== undefined &&
                    spaceStream.view.snapshot.content.value.spaceImage.data !== undefined,
            ).toBe(true)
        })

        // decrypt the snapshot and assert the image values
        const encryptedData =
            spaceStream.view.snapshot?.content.case === 'spaceContent'
                ? spaceStream.view.snapshot.content.value.spaceImage?.data
                : undefined
        expect(
            encryptedData !== undefined &&
                isEncryptedData(encryptedData) &&
                encryptedData.algorithm === AES_GCM_DERIVED_ALGORITHM,
        ).toBe(true)
        const decrypted = encryptedData
            ? await bobsClient.decryptSpaceImage(spaceId, encryptedData)
            : undefined
        expect(
            decrypted !== undefined &&
                decrypted.info?.mimetype === image.mimetype &&
                decrypted.info?.filename === image.filename &&
                decrypted.encryption.case === 'derived' &&
                decrypted.encryption.value.context === spaceContractAddress,
        ).toBe(true)

        // make another space image event
        const mediaStreamId2 = makeUniqueMediaStreamId()
        const image2 = new MediaInfo({
            mimetype: 'image/jpg',
            filename: 'bob-2.jpg',
        })

        await bobsClient.setSpaceImage(spaceId, mediaStreamId2, image2)

        // make a snapshot
        await bobsClient.debugForceMakeMiniblock(spaceId, { forceSnapshot: true })

        // see the space image in the snapshot
        await waitFor(() => {
            expect(
                spaceStream.view.snapshot?.content.case === 'spaceContent' &&
                    spaceStream.view.snapshot.content.value.spaceImage !== undefined &&
                    spaceStream.view.snapshot.content.value.spaceImage.data !== undefined,
            ).toBe(true)
        })

        // decrypt the snapshot and assert the image values
        const spaceImage = await spaceStream.view.spaceContent.getSpaceImage()
        expect(
            spaceImage !== undefined &&
                spaceImage?.info?.mimetype === image2.mimetype &&
                spaceImage?.info?.filename === image2.filename &&
                spaceImage.encryption.case === 'derived' &&
                spaceImage.encryption.value.context === spaceContractAddress,
        ).toBe(true)
    })
})
