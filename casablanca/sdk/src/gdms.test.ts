/**
 * @group main
 */

import { makeTestClient, createEventDecryptedPromise, waitFor, makeDonePromise } from './util.test'
import { Client } from './client'
import { dlog } from '@river/waterproof'
import { MembershipOp } from '@river/proto'

const log = dlog('csb:test')

describe('gdmsTests', () => {
    let bobsClient: Client
    let alicesClient: Client
    let charliesClient: Client
    let chucksClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.initializeUser()
        bobsClient.startSync()

        alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()

        charliesClient = await makeTestClient()
        await charliesClient.initializeUser()
        charliesClient.startSync()

        chucksClient = await makeTestClient()
        await chucksClient.initializeUser()
        chucksClient.startSync()
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

    test('clientAreJoinedAutomaticallyAndCanPostToGDM', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(charliesClient.waitForStream(streamId)).toResolve()

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

        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.leaveStream(streamId)).toResolve()

        const stream = await bobsClient.waitForStream(streamId)
        await waitFor(() => {
            expect(stream.view.getMemberships().joinedUsers).toEqual(
                new Set([bobsClient.userId, charliesClient.userId]),
            )
        })
        await expect(alicesClient.sendMessage(streamId, 'hello!')).toReject()
    })

    test('clientCanLeaveGDM', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.leaveStream(streamId)).toResolve()
    })

    test('uninvitedUsersCannotInviteOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(chucksClient.inviteUser(streamId, alicesClient.userId)).toReject()
        await expect(chucksClient.inviteUser(streamId, chucksClient.userId)).toReject()
    })

    test('invitedUsersCanInviteOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.inviteUser(streamId, chucksClient.userId)).toResolve()
    })

    test('gdmsRequireThreeOrMoreUsers', async () => {
        const userIds = [alicesClient.userId]
        await expect(bobsClient.createGDMChannel(userIds)).toReject()
    })

    // Sender is expected to push keys to all members of the channel before sending the message,
    test('usersReceiveKeys', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId, chucksClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(chucksClient.waitForStream(streamId)).toResolve()

        const promises = [alicesClient, charliesClient, chucksClient].map((client) =>
            createEventDecryptedPromise(client, 'hello'),
        )

        await bobsClient.sendMessage(streamId, 'hello')
        log('waiting for recipients to receive message')
        await Promise.all(promises)
    })

    test('usersReceiveKeysAfterInvite', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()

        const aliceCharliePromises = [alicesClient, charliesClient].map((client) =>
            createEventDecryptedPromise(client, 'hello'),
        )

        await bobsClient.sendMessage(streamId, 'hello')
        log('waiting for recipients to receive message')
        await Promise.all(aliceCharliePromises)

        // In this test, Bob invites Chuck _after_ sending the message
        await expect(bobsClient.inviteUser(streamId, chucksClient.userId)).toResolve()
        const stream = await chucksClient.waitForStream(streamId)
        await stream.waitForMembership(MembershipOp.SO_INVITE)
        await expect(chucksClient.joinStream(streamId)).toResolve()
        const chuckPromise = createEventDecryptedPromise(chucksClient, 'hello')
        await expect(await chuckPromise).toResolve()
    })

    // In this test, Bob goes offline after sending the message,
    // before Chuck has joined the channel.
    test('usersReceiveKeysBobGoesOffline', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()

        const aliceCharliePromises = [alicesClient, charliesClient].map((client) =>
            createEventDecryptedPromise(client, 'hello'),
        )

        await bobsClient.sendMessage(streamId, 'hello')
        log('waiting for recipients to receive message')
        await Promise.all(aliceCharliePromises)
        await bobsClient.stop()

        await expect(alicesClient.inviteUser(streamId, chucksClient.userId)).toResolve()
        const stream = await chucksClient.waitForStream(streamId)
        await stream.waitForMembership(MembershipOp.SO_INVITE)
        await expect(chucksClient.joinStream(streamId)).toResolve()
        const chuckPromise = createEventDecryptedPromise(chucksClient, 'hello')
        await expect(await chuckPromise).toResolve()
    })

    // Users should eventually receive keys — even if they have not JOINED the channel yet.
    // for GDMS, an INVITE is enough
    test('usersReceiveKeysWithoutJoin', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId, chucksClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()

        const promises = [alicesClient, charliesClient, chucksClient].map((client) =>
            createEventDecryptedPromise(client, 'hello'),
        )

        await bobsClient.sendMessage(streamId, 'hello')
        log('waiting for recipients to receive message')
        await Promise.all(promises)
    })

    test('usersCanSetChannelProperties', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId, chucksClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(charliesClient.waitForStream(streamId)).toResolve()
        await expect(chucksClient.waitForStream(streamId)).toResolve()

        const name = "Bob's GDM"
        const topic = "Bob's GDM description"

        function createChannelPropertiesPromise(client: Client) {
            const donePromise = makeDonePromise()
            client.on('streamChannelPropertiesUpdated', (updatedStreamId: string): void => {
                donePromise.runAndDone(() => {
                    expect(updatedStreamId).toEqual(streamId)
                    const stream = client.streams.get(streamId)

                    const channelMetadata = stream?.view.getChannelMetadata()
                    const channelProperties = channelMetadata?.channelProperties
                    expect(channelProperties).toBeDefined()

                    expect(channelProperties?.name).toEqual(name)
                    expect(channelProperties?.topic).toEqual(topic)
                })
            })
            return donePromise.promise
        }

        const promises = [bobsClient, alicesClient, charliesClient, chucksClient].map(
            createChannelPropertiesPromise,
        )

        await expect(bobsClient.updateGDMChannelProperties(streamId, name, topic)).toResolve()
        log('waiting for members to receive new channel props')
        await Promise.all(promises)
    })

    test('membersCanRemoveMembers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(charliesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.removeUser(streamId, charliesClient.userId)).toResolve()
        const stream = await alicesClient.waitForStream(streamId)
        stream.waitForMembership(MembershipOp.SO_LEAVE, charliesClient.userId)
    })

    test('nonMembersCannotRemoveMembers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(charliesClient.waitForStream(streamId)).toResolve()

        // @ts-ignore
        await expect(chucksClient.initStream(streamId)).toResolve()
        await expect(chucksClient.removeUser(streamId, charliesClient.userId)).rejects.toThrow(
            'user is not a member of gdm channel',
        )
    })
})
