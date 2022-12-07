/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { RoomIdentifier, RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ZionContractTypes'
import { TestConstants } from './helpers/TestConstants'

describe('channel with roles and permissions', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)

    test('join token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const tokenGrantedUserId = tokenGrantedUser.matrixUserId as string
        const { alice } = await registerAndStartClients(['alice'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId,
            roleIds: [],
        })) as RoomIdentifier

        // invite user to join the channel
        await alice.inviteUser(channelId, tokenGrantedUserId)

        /** Act */

        // join the channel
        const room = await tokenGrantedUser.joinRoom(channelId)

        /** Assert */
        expect(room.id.matrixRoomId).toBeTruthy()
    }) // end test

    test('join Everyone channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithEveryoneRole(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId,
            roleIds: [],
        })) as RoomIdentifier

        /** Act */

        // join the channel
        const room = await bob.joinRoom(channelId)

        /** Assert */
        expect(room.id.matrixRoomId).toBeTruthy()
    }) // end test

    test('denied access to token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const bobUserId = bob.matrixUserId as string
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: spaceId,
            roleIds: [],
        })) as RoomIdentifier
        // invite user to join the channel
        await alice.inviteUser(channelId, bobUserId)

        /** Act & Assert */

        // join the channel
        await expect(bob.joinRoom(channelId)).rejects.toThrow('Unauthorised')
    }) // end test
})
