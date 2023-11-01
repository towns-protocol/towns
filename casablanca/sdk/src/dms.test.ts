import { makeTestClient } from './util.test'
import { Client } from './client'

describe('dmsTests', () => {
    let bobsClient: Client
    let alicesClient: Client
    let charliesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.createNewUser()
        await bobsClient.initCrypto()
        await bobsClient.startSync()

        alicesClient = await makeTestClient()
        await alicesClient.createNewUser()
        await alicesClient.initCrypto()
        await alicesClient.startSync()

        charliesClient = await makeTestClient()
        await charliesClient.createNewUser()
        await charliesClient.initCrypto()
        await charliesClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
        await charliesClient.stop()
    })

    test('clientCanCreateDM', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.getStream(streamId)
        expect(stream.getMemberships().joinedUsers).toEqual(new Set([bobsClient.userId]))
        expect(stream.getMemberships().invitedUsers).toEqual(new Set([alicesClient.userId]))
    })

    test('clientCanJoinAndLeaveDM', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(alicesClient.joinStream(streamId)).toResolve()

        const stream = await bobsClient.getStream(streamId)
        expect(stream.getMemberships().joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )

        await expect(alicesClient.leaveStream(streamId)).toResolve()
    })

    test('clientsCanSendMessages', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(bobsClient.sendMessage(streamId, 'hello')).toResolve()

        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello')).toResolve()
    })

    test('otherUsersCantJoinDM', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(charliesClient.joinStream(streamId)).toReject()
    })

    test('otherUsersCantSendMessages', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(charliesClient.joinStream(streamId)).toReject()
        await expect(charliesClient.sendMessage(streamId, 'hello')).toReject()
    })

    test('usersCantInviteOtherUsers', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.inviteUser(streamId, charliesClient.userId)).toReject()
    })

    test.skip('creatingDMChannelTwiceReturnsStreamId', async () => {
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        await expect(bobsClient.waitForStream(streamId)).toResolve()

        const { streamId: streamId2 } = await bobsClient.createDMChannel(alicesClient.userId)
        expect(streamId).toEqual(streamId2)
    })
})
