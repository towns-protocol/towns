/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import {
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from './helpers/TestUtils'
import { Permission } from '@towns-protocol/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageThreads', () => {
    test('send a threaded message', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient(
            'alice',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = await createTestSpaceGatedByTownsNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])
        // create a channel
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roles: [],
        })

        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(channelId))

        // alice sends a message
        await alice.sendMessage(channelId, 'hi Bob!')
        // bob should receive the message
        await waitFor(() => expect(bob.getMessages(channelId)).toContain('hi Bob!'))

        // get the message id
        const messageId = bob
            .getEvents_TypedChannelMessage(channelId)!
            .find((event) => event.content?.body === 'hi Bob!')!.eventId
        // bob sends a threaded message
        await bob.sendMessage(channelId, 'hi Alice!', { threadId: messageId })
        // alice should receive the message
        await waitFor(() =>
            expect(
                alice
                    .getEvents_TypedChannelMessage(channelId)
                    .find((event) => event.content && event.content.threadId === messageId),
            ).toBeDefined(),
        )
    }) // end test - send a threaded message
}) // end describe
