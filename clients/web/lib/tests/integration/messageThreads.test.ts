/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 * @group dendrite
 */
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from './helpers/TestUtils'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'
import { RoomVisibility } from '../../src/types/zion-types'

describe('messageThreads', () => {
    test('send a threaded message', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        // alice joins the room
        await waitForWithRetries(() => alice.joinRoom(channelId))

        // alice sends a message
        await alice.sendMessage(channelId, 'hi Bob!')
        // bob should receive the message
        await waitFor(() => expect(bob.getMessages(channelId)).toContain('hi Bob!'))

        // get the message id
        const messageId = bob
            .getEvents_TypedRoomMessage(channelId)!
            .find((event) => event.content?.body === 'hi Bob!')!.eventId
        // bob sends a threaded message
        await bob.sendMessage(channelId, 'hi Alice!', { threadId: messageId })
        // alice should receive the message
        await waitFor(() =>
            expect(
                alice
                    .getEvents_TypedRoomMessage(channelId)
                    .find((event) => event.content && event.content.inReplyTo === messageId),
            ).toBeDefined(),
        )
    }) // end test - send a threaded message
}) // end describe
