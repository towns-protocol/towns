/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageThreads', () => {
    test('send a threaded message', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a message
        await alice.sendMessage(roomId, 'hi Bob!')
        // bob should receive the message
        await waitFor(() => expect(bob.getMessages(roomId)).toContain('hi Bob!'))

        // get the message id
        const messageId = bob
            .getEvents_TypedRoomMessage(roomId)!
            .find((event) => event.content?.body === 'hi Bob!')!.eventId
        // bob sends a threaded message
        await bob.sendMessage(roomId, 'hi Alice!', { threadId: messageId })
        // alice should receive the message
        await waitFor(() =>
            expect(
                alice
                    .getEvents_TypedRoomMessage(roomId)
                    .find((event) => event.content && event.content.inReplyTo === messageId),
            ).toBeDefined(),
        )
    }) // end test - send a threaded message
}) // end describe
