/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { TestConstants } from './helpers/TestConstants'
import { Permission } from '@river/web3'

describe('channel with roles and permissions', () => {
    test('join token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
        )
        const tokenGrantedUserId = tokenGrantedUser.getUserId() as string
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
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(channelId))
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
        await waitForWithRetries(() => bob.joinRoom(channelId))
    }) // end test

    test('denied access to token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const bobUserId = bob.getUserId() as string
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
        await expect(bob.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|PermissionDenied'),
        )
    }) // end test
})
