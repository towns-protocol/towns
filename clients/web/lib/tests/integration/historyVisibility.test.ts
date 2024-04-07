/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import { waitFor } from '@testing-library/react'
import { Permission } from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    makeUniqueName,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'
import { TownsTestClient } from './helpers/TownsTestClient'

describe('historyVisibility', () => {
    test('create public room, send message, join second user, read message', async () => {
        // create bob
        const { bob, john } = await registerAndStartClients(['bob', 'john'])
        //
        await bob.fundWallet()
        // bob creates a room
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobsroom'),
            },
        )

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            parentSpaceId: spaceId,
            name: 'bobs channel',
            roleIds: [],
        })

        await john.joinTown(spaceId, john.wallet)

        await waitForWithRetries(() => john.joinRoom(roomId))

        // if we don't wait for encryption, we'll send unencrypted messages :(

        await waitForWithRetries(() => john.sendMessage(roomId, "I'm John!"))

        await waitFor(() => expect(bob.getMessages(roomId)).toContain("I'm John!"))

        await john.logout()

        await bob.sendMessage(roomId, 'Hello World!')
        // create alice (important to do in this order, we had a bug were alice
        // would not be able to see messages if she registered after bob sent a message)
        const { alice } = await registerAndStartClients(['alice'])
        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)

        await waitForWithRetries(() => alice.joinRoom(roomId))

        // and we should see the message
        await waitFor(
            () => expect(alice.getMessages(roomId)).toContain('Hello World!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() => expect(alice.getMessages(roomId)).toContain("I'm John!"))

        await waitForWithRetries(() => alice.sendMessage(roomId, "I'm Alice!"))

        await waitFor(() => expect(bob.getMessages(roomId)).toContain("I'm Alice!"))

        await alice.logout()

        await john.loginWalletAndStartClient()
        await john.waitForStream(roomId)
        //
        john.logEvents(roomId)
        // and we should see the message
        await waitFor(
            () => expect(john.getMessages(roomId)).toContain('Hello World!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() => expect(john.getMessages(roomId)).toContain("I'm John!"))

        await waitFor(() => expect(john.getMessages(roomId)).toContain("I'm Alice!"), {
            onTimeout: (e) => {
                john.logEvents(roomId)
                return e
            },
        })

        // create a new client with same wallet, but different deviceId/auth
        const alice2 = new TownsTestClient('alice2', alice.props, alice.wallet)

        await alice2.loginWalletAndStartClient()

        await alice2.waitForStream(roomId)

        await waitFor(
            () => expect(alice2.getMessages(roomId)).toContain('Hello World!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() => expect(alice2.getMessages(roomId)).toContain("I'm John!"))

        await waitFor(() => expect(alice2.getMessages(roomId)).toContain("I'm Alice!"))

        // have bob and john log out
        await bob.logout()
        await john.logout()

        // have alice log into yet another client, see if she will share keys with herself
        const alice3 = new TownsTestClient('alice3', alice.props, alice.wallet)

        await alice3.loginWalletAndStartClient()

        await alice3.waitForStream(roomId)

        await waitFor(
            () => expect(alice3.getMessages(roomId)).toContain('Hello World!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() => expect(alice3.getMessages(roomId)).toContain("I'm John!"))

        await waitFor(() => expect(alice3.getMessages(roomId)).toContain("I'm Alice!"))
        await alice.logout()
        await alice2.logout()
        await alice3.logout()
        await john.logout()
    }, 120000) // slow test that takes more than 60 seconds occasionally
})
