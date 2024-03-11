/**
 * @group core
 */
import { NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    waitForWithRetries,
    findRoleByName,
    createTestChannelWithSpaceRoles,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { ZTEvent } from '../../src/types/timeline-types'
import { waitFor } from '@testing-library/dom'
import { NoopRuleData, Permission } from '@river/web3'

const EveryoneRoleName = 'Everyone'
const MemberRoleName = 'Member'

describe('redact messages', () => {
    test('member can redact own messages', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()
        // create a space
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }
        await alice.waitForStream(spaceId)

        // create a channel for reading and writing
        // get current role details
        const roleDetails = await findRoleByName(alice, spaceId, MemberRoleName)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }
        const channelId = await alice.createChannel(
            {
                name: 'test channel',
                parentSpaceId: spaceId,
                roleIds: [roleDetails.id],
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }
        await alice.waitForStream(channelId)

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
        const spaceId = await createTestSpaceGatedByTownNft(
            alice,
            [Permission.Read, Permission.Write],
            {
                name: alice.makeUniqueName(),
            },
        )
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }
        // create a channel for reading and writing
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alices channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!
        if (!channelId) {
            throw new Error('channelId is undefined')
        }
        // invite user to join the channel
        const bobUserId = bob.getUserId()
        if (!bobUserId) {
            throw new Error('Failed to get bob user id')
        }
        await bob.joinTown(spaceId, bob.wallet)
        await bob.joinRoom(channelId)

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
        await bob.redactEvent(channelId, messageEvent.eventId)

        /** Assert */
        // verify that the message is NOT redacted
        expect(alice.getMessages(channelId)).toContain(message)
    })

    test("moderator can redact other's messages", async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        // create a space with entitlement to read and write
        const spaceId = await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }

        // get the roles for channel creation later
        const roleDetails = await findRoleByName(alice, spaceId, EveryoneRoleName)
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }
        // create the moderator role with the permission to redact messages
        const permissions = [Permission.Read, Permission.Write, Permission.Redact]
        // add bob to the moderator role
        if (!bob.walletAddress) {
            throw new Error('Failed to get bob wallet address')
        }
        const users: string[] = [bob.walletAddress]
        const moderatorRoleId = await alice.createRole(
            spaceId,
            'moderator',
            permissions,
            users,
            NoopRuleData,
        )
        if (!moderatorRoleId) {
            throw new Error('Failed to create moderator role')
        }
        // create a channel for reading and writing
        const channelId = await alice.createChannel(
            {
                name: 'test channel',
                parentSpaceId: spaceId,
                // add the space role and the moderator role to the channel
                roleIds: [roleDetails.id, moderatorRoleId.roleId],
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }
        // invite user to join the channel
        const bobUserId = bob.getUserId()
        if (!bobUserId) {
            throw new Error('Failed to get bob user id')
        }
        await bob.joinTown(spaceId, bob.wallet)
        await bob.joinRoom(channelId)

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
