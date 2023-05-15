/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import { waitFor } from '@testing-library/react'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'
import { ZionTestClient } from './helpers/ZionTestClient'

describe('historyVisibility', () => {
    test('create public room, send message, join second user, read message', async () => {
        // create bob
        const { bob, john } = await registerAndStartClients(['bob', 'john'])
        //
        await bob.fundWallet()
        // bob creates a room
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobsroom'),
                visibility: RoomVisibility.Public,
            },
        ))!

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            parentSpaceId: spaceId,
            name: 'bobs channel',
            visibility: RoomVisibility.Public,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('roomId is undefined')
        }

        await john.joinRoom(spaceId)

        await john.joinRoom(roomId)
        // if we don't wait for encryption, we'll send unencrypted messages :(
        await waitFor(() => expect(john.isRoomEncrypted(roomId)).toBeTruthy())

        await john.sendMessage(roomId, "I'm John!")

        await waitFor(() => expect(bob.getMessages(roomId)).toContain("I'm John!"))

        await john.logout()

        await waitFor(() => expect(bob.isRoomEncrypted(roomId)).toBeTruthy())
        await bob.sendMessage(roomId, 'Hello World!')
        // create alice (important to do in this order, we had a bug were alice
        // would not be able to see messages if she registered after bob sent a message)
        const { alice } = await registerAndStartClients(['alice'])
        // alice joins the room
        await alice.joinRoom(spaceId)
        await alice.joinRoom(roomId)

        // and we should see the message
        await waitFor(
            () => expect(alice.getMessages(roomId)).toContain('Hello World!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() => expect(alice.getMessages(roomId)).toContain("I'm John!"))

        await alice.sendMessage(roomId, "I'm Alice!")

        await waitFor(() => expect(bob.getMessages(roomId)).toContain("I'm Alice!"))

        await alice.logout()

        await john.loginWalletAndStartClient()
        await waitFor(() => expect(john.matrixClient?.getRoom(roomId.networkId)).toBeTruthy())
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
        const alice2 = new ZionTestClient(alice.chainId, 'alice2', alice.props, alice.wallet)

        await alice2.loginWalletAndStartClient()

        expect(alice2.auth?.deviceId).not.toEqual(alice.auth?.deviceId)
        await waitFor(() => expect(alice2.matrixClient?.getRoom(roomId.networkId)).toBeTruthy())

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
        const alice3 = new ZionTestClient(alice.chainId, 'alice2', alice.props, alice.wallet)

        await alice3.loginWalletAndStartClient()

        expect(alice3.auth?.deviceId).not.toEqual(alice.auth?.deviceId)

        await waitFor(() => expect(alice3.matrixClient?.getRoom(roomId.networkId)).toBeTruthy())

        await waitFor(
            () => expect(alice3.getMessages(roomId)).toContain('Hello World!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        await waitFor(() => expect(alice3.getMessages(roomId)).toContain("I'm John!"))

        await waitFor(() => expect(alice3.getMessages(roomId)).toContain("I'm Alice!"))
    })
})
