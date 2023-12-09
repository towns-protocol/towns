/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
    createTestSpaceGatedByTownNft,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission, createExternalTokenStruct, getTestGatingNftAddress } from '@river/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('write messages', () => {
    test('Channel member cant write messages without permission', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await bob.fundWallet()

        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const membershipTokenAddress = await alice.spaceDapp.getTownMembershipTokenAddress(
            spaceId.networkId,
        )
        const councilNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!councilNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const councilToken = createExternalTokenStruct([councilNftAddress])[0]
        const membershipToken = createExternalTokenStruct([membershipTokenAddress])[0]

        // update the member role so only council nft holders can write
        await bob.updateRoleTransaction(
            spaceId.networkId,
            2,
            'Member',
            [Permission.Read, Permission.Write],
            [councilToken, membershipToken],
            [],
            bob.wallet,
        )

        // create read only role
        await bob.createRoleTransaction(
            spaceId.networkId,
            'Read only',
            [Permission.Read],
            [membershipToken],
            [],
            bob.wallet,
        )

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        // create a channel that has this read only role
        const roomId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('Failed to create room')
        }

        // /** Act */

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, alice.getUserId() as string)
        await alice.joinTown(spaceId, alice.wallet)
        await waitForWithRetries(() => alice.joinRoom(roomId))
        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello tokenGrantedUser!')

        // TODO check why on Casablanca the error does not show in the console
        // const consoleErrorSpy = jest.spyOn(global.console, 'error')
        /** Assert */
        // user sends a message to the room
        try {
            await alice.sendMessage(roomId, 'Hello Bob!')
        } catch (e) {
            expect((e as Error).message).toMatch(new RegExp('Unauthorised|permission_denied'))
        }
        //expect(consoleErrorSpy).toHaveBeenCalled()
        await waitFor(
            () => expect(alice.getMessages(roomId)).toContain('Hello tokenGrantedUser!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // bob should not receive the message
        expect(bob.getMessages(roomId)).not.toContain('Hello Bob!')
    })

    test('Channel member can sync messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('Failed to create room')
        }

        /** Act */

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(spaceId, tokenGrantedUser.getUserId() as string)
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(roomId))
        // bob send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(roomId, `message ${i}`)
        }

        // /** Assert */

        // user should expect an invite to the room
        await waitFor(() => expect(tokenGrantedUser.getRoomData(roomId)).toBeDefined())

        // we should get more events
        await waitFor(() => expect(tokenGrantedUser.getEvents(roomId).length).toBeGreaterThan(20))
    }, 180_000)

    test('Channel member can write messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])

        if (!spaceId) {
            throw new Error('Failed to create room')
        }

        const roomId = await createTestChannelWithSpaceRoles(bob, {
            name: 'main channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        if (!roomId) {
            throw new Error('Failed to create room')
        }

        /** Act */
        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, tokenGrantedUser.getUserId() as string)
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(roomId))

        // bob sends a message to the room
        await bob.sendMessage(roomId, 'Hello tokenGrantedUser!')

        // user sends a message to the room
        await waitForWithRetries(() => tokenGrantedUser.sendMessage(roomId, 'Hello Bob!'))

        /** Assert */

        await waitFor(
            () => expect(bob.getMessages(roomId)).toContain('Hello Bob!'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    }, 180_000)
})
