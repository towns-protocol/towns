/**
 * @group dendrite
 * @group casablanca
 */
import { NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { ZTEvent } from '../../src/types/timeline-types'
import { getFilteredRolesFromSpace } from '../../src/client/web3/ContractHelpers'
import { waitFor } from '@testing-library/dom'

// TODO: https://linear.app/hnt-labs/issue/HNT-1731/clientsweblibtestsintegrationpermissionsredacttestts
describe.skip('redact messages', () => {
    test('member can redact own messages', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        // create a space
        const spaceId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }
        // create a channel for reading and writing
        const roles = await getFilteredRolesFromSpace(alice, spaceId.networkId)
        const channelId = await alice.createChannel(
            {
                name: 'test channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: spaceId,
                roleIds: [roles[0].roleId],
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }

        /** Act */
        // alice sends a message to the room
        const message = 'Hello me, myself, and alice!'
        await alice.sendMessage(channelId, message)
        await waitFor(async () => {
            const event = await alice.getLatestEvent(channelId, ZTEvent.RoomMessage)
            expect(event).toBeDefined()
            expect(event?.isLocalPending).toBe(false)
        })
        const messageEvent = await alice.getLatestEvent(channelId, ZTEvent.RoomMessage)
        if (!messageEvent) {
            throw new Error(`Failed to get message event ${alice.getEventsDescription(channelId)}`)
        }
        // redact the message
        const error = await getError<Error>(async function () {
            await alice.redactEvent(channelId, messageEvent.eventId)
        })

        /** Assert */
        // verify that no error was thrown for redaction
        expect(error).toBeInstanceOf(NoThrownError)
        // verify that the message is redacted
        await waitFor(() => expect(alice.getMessages(channelId)).not.toContain(message))
    })

    test("member cannot redact other's messages", async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        // create a space with entitlement to read and write
        const spaceId = await createTestSpaceWithEveryoneRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }
        // create a channel for reading and writing
        const roles = await getFilteredRolesFromSpace(alice, spaceId.networkId)
        const channelId = await alice.createChannel(
            {
                name: 'test channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: spaceId,
                roleIds: [roles[0].roleId],
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }
        // invite user to join the channel
        const bobUserId = bob.getUserId()
        if (!bobUserId) {
            throw new Error('Failed to get bob matrix user id')
        }
        await alice.inviteUser(channelId, bobUserId)
        await waitForWithRetries(() => bob.joinRoom(channelId))

        /** Act */
        // alice sends a message in the channel
        const message = 'Hello I am alice!'
        await alice.sendMessage(channelId, message)
        await waitFor(() => expect(bob.getMessages(channelId)).toContain(message))
        const messageEvent = bob
            .getEvents_TypedRoomMessage(channelId)
            .find((event) => event.content.body === message)
        if (!messageEvent) {
            throw new Error(`Failed to get message event ${bob.getEventsDescription(channelId)}`)
        }
        // bob tries to redact alice's message
        const error = await getError<Error>(async function () {
            await bob.redactEvent(channelId, messageEvent.eventId)
        })

        /** Assert */
        // verify that error was thrown for redaction
        expect(error.message).toMatch(new RegExp('Unauthorised|PermissionDenied'))
        // verify that the message is NOT redacted
        expect(alice.getMessages(channelId)).toContain(message)
    })

    test("moderator can redact other's messages", async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        // create a space with entitlement to read and write
        const spaceId = await createTestSpaceWithEveryoneRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }
        // get the roles for channel creation later
        const roles = await getFilteredRolesFromSpace(alice, spaceId.networkId)
        // create the moderator role with the permission to redact messages
        const permissions = [Permission.Read, Permission.Write, Permission.Redact]
        // add bob to the moderator role
        if (!bob.walletAddress) {
            throw new Error('Failed to get bob wallet address')
        }
        const users: string[] = [bob.walletAddress]
        const moderatorRoleId = await alice.createRole(
            spaceId.networkId,
            'moderator',
            permissions,
            [],
            users,
        )
        if (!moderatorRoleId) {
            throw new Error('Failed to create moderator role')
        }
        // create a channel for reading and writing
        const channelId = await alice.createChannel(
            {
                name: 'test channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: spaceId,
                // add the space role and the moderator role to the channel
                roleIds: [roles[0].roleId, moderatorRoleId.roleId],
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }
        // invite user to join the channel
        const bobUserId = bob.getUserId()
        if (!bobUserId) {
            throw new Error('Failed to get bob matrix user id')
        }
        await alice.inviteUser(channelId, bobUserId)
        await waitForWithRetries(() => bob.joinRoom(channelId))

        /** Act */
        // alice sends a message in the channel
        const message = 'Hello I am alice!'
        await alice.sendMessage(channelId, message)
        // use a scrollback to get the message event
        await waitFor(() => expect(bob.getMessages(channelId)).toContain(message))
        const messageEvent = bob
            .getEvents_TypedRoomMessage(channelId)
            .find((event) => event.content.body === message)
        if (!messageEvent) {
            throw new Error(`Failed to get message event: ${bob.getEventsDescription(channelId)}`)
        }

        /** Assert */
        // verify that NO error was thrown for redaction
        await waitForWithRetries(async () => bob.redactEvent(channelId, messageEvent.eventId))
        // verify that the message is redacted
        await waitFor(() => expect(alice.getMessages(channelId)).not.toContain(message))
    })
})
