import { makeTestClient } from './util.test'
import { Client } from './client'

describe('dmsTests', () => {
    let bobsClient: Client
    let alicesClient: Client
    let charliesClient: Client
    let chucksClient: Client

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

        chucksClient = await makeTestClient()
        await chucksClient.createNewUser()
        await chucksClient.initCrypto()
        await chucksClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
        await charliesClient.stop()
        await chucksClient.stop()
    })

    test('clientCanCreateGDM', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(bobsClient.sendMessage(streamId, 'hello')).toResolve()
    })

    test('clientCanJoinAndPostToGDM', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()

        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(charliesClient.joinStream(streamId)).toResolve()

        await expect(bobsClient.sendMessage(streamId, 'greetings')).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello!')).toResolve()
        await expect(charliesClient.sendMessage(streamId, 'hi')).toResolve()
    })

    test('clientCannotJoinUnlessInvited', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()

        await expect(chucksClient.joinStream(streamId)).toReject()
    })

    test('clientCannotPostUnlessJoined', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello!')).toReject()
    })

    test('clientCanLeaveGDM', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(alicesClient.leaveStream(streamId)).toResolve()
    })

    test('uninvitedUsersCannotInviteOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(chucksClient.inviteUser(streamId, alicesClient.userId)).toReject()
        await expect(chucksClient.inviteUser(streamId, chucksClient.userId)).toReject()
        await expect(alicesClient.inviteUser(streamId, chucksClient.userId)).toReject()
        await expect(alicesClient.inviteUser(streamId, alicesClient.userId)).toReject()
    })

    test('invitedUsersCanInviteOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.joinStream(streamId)).toResolve()
        await expect(alicesClient.inviteUser(streamId, chucksClient.userId)).toResolve()
    })

    test('gdmsRequireThreeOrMoreUsers', async () => {
        const userIds = [alicesClient.userId]
        await expect(bobsClient.createGDMChannel(userIds)).toReject()
    })
})
