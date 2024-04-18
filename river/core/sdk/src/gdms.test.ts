/**
 * @group main
 */

import { makeTestClient, createEventDecryptedPromise, waitFor, makeDonePromise } from './util.test'
import { Client } from './client'
import { MembershipOp } from '@river-build/proto'
import { dlog } from '@river-build/dlog'

const log = dlog('csb:test:gdmsTests')

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

        log('clients initialized', {
            chuck: chucksClient.userId,
            bob: bobsClient.userId,
            alice: alicesClient.userId,
            charlie: charliesClient.userId,
        })
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
            expect(stream.view.getMembers().membership.joinedUsers).toEqual(
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

    test('usersCanInviteOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.inviteUser(streamId, chucksClient.userId)).toResolve()
    })

    test('unjoinedUsersCannotJoinOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        // can chuck join himself?
        await expect(chucksClient.joinUser(streamId, chucksClient.userId)).toReject()
        // can chuck join chucks friend?
        const chucksFriend = await makeTestClient()
        await chucksFriend.initializeUser()
        await expect(chucksClient.joinUser(streamId, chucksFriend.userId)).toReject()
    })

    test('usersCanJoinOthers', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.joinUser(streamId, chucksClient.userId)).toResolve()
        const stream = await chucksClient.waitForStream(streamId)
        await waitFor(() => {
            expect(
                stream.view.getMembers().membership.joinedUsers.has(charliesClient.userId),
            ).toEqual(true)
        })
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

    test('usersReceiveKeysAfterInviteAndJoin', async () => {
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
        const chuckPromise = createEventDecryptedPromise(chucksClient, 'hello')
        await expect(bobsClient.inviteUser(streamId, chucksClient.userId)).toResolve()
        const stream = await chucksClient.waitForStream(streamId)
        await stream.waitForMembership(MembershipOp.SO_INVITE)
        await expect(chucksClient.joinStream(streamId)).toResolve()
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

        const chuckPromise = createEventDecryptedPromise(chucksClient, 'hello')
        await expect(alicesClient.inviteUser(streamId, chucksClient.userId)).toResolve()
        const stream = await chucksClient.waitForStream(streamId)
        await stream.waitForMembership(MembershipOp.SO_INVITE)
        await expect(chucksClient.joinStream(streamId)).toResolve()
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
        await stream.waitForMembership(MembershipOp.SO_LEAVE, charliesClient.userId)
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
            'initiator of leave is not a member of GDM',
        )
    })

    test('membershipLimitCanBeEqualedOnInception', async () => {
        const userIds: string[] = []
        // Create 5 users
        for (let i = 0; i < 5; i++) {
            const client = await makeTestClient()
            await client.initializeUser()
            userIds.push(client.userId)
        }
        // 6 members total is OK
        const { streamId } = await bobsClient.createGDMChannel(userIds)
        expect(streamId).toBeDefined()
    })

    test('membershipLimitCannotBeExceededOnInception', async () => {
        const userIds: string[] = []
        // Create 6 users
        for (let i = 0; i < 6; i++) {
            const client = await makeTestClient()
            await client.initializeUser()
            userIds.push(client.userId)
        }
        // 7 members total exceeds the configured limit
        await expect(bobsClient.createGDMChannel(userIds)).rejects.toThrow(
            /membership limit reached[\s]+membershipLimit = 6/,
        )
    })

    test('membershipLimitCannotBeExceededByJoins', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)

        // add 3 more users
        for (let i = 0; i < 3; i++) {
            const client = await makeTestClient()
            await client.initializeUser()
            await expect(bobsClient.joinUser(streamId, client.userId)).toResolve()
        }

        // total memberships are now 6, joining another user should fail
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(bobsClient.joinUser(streamId, chucksClient.userId)).rejects.toThrow(
            /membership limit reached[\s]+membershipLimit = 6/,
        )
    })

    test('membershipLimitCannotBeExceededByInvites', async () => {
        const userIds = [alicesClient.userId, charliesClient.userId]
        const { streamId } = await bobsClient.createGDMChannel(userIds)

        // add 3 more users
        for (let i = 0; i < 3; i++) {
            const client = await makeTestClient()
            await client.initializeUser()
            await expect(bobsClient.joinUser(streamId, client.userId)).toResolve()
        }

        // total memberships are now 6, inviting another user should fail
        await expect(bobsClient.waitForStream(streamId)).toResolve()
        await expect(bobsClient.inviteUser(streamId, chucksClient.userId)).rejects.toThrow(
            /membership limit reached[\s]+membershipLimit = 6/,
        )
    })
})
