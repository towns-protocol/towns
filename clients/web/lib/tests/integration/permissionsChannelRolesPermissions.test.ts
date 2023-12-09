/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { RoomIdentifier } from '../../src/types/room-identifier'
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { TestConstants } from './helpers/TestConstants'
import { Permission, createExternalTokenStruct, getTestGatingNftAddress } from '@river/web3'
import { RoleIdentifier } from '../../src/types/web3-types'

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
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as RoomIdentifier

        // invite user to join the channel
        await alice.inviteUser(channelId, tokenGrantedUserId)

        /** Act */

        // join the channel
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(channelId))
    }) // end test

    test('join Everyone channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as RoomIdentifier

        /** Act */

        // join the channel
        await bob.joinTown(spaceId, bob.wallet)
        await waitForWithRetries(() => bob.joinRoom(channelId))
    }) // end test

    test('denied access to token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const bobUserId = bob.getUserId() as string
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        const testGatingNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        const testGatingNftToken = createExternalTokenStruct([testGatingNftAddress])[0]
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId.networkId,
            'newRoleName',
            [Permission.Read, Permission.Write],
            [testGatingNftToken],
            [],
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }

        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [roleIdentifier.roleId],
        })) as RoomIdentifier
        // invite user to join the channel
        await alice.inviteUser(channelId, bobUserId)

        /** Act & Assert */

        // join the channel
        await bob.joinTown(spaceId, bob.wallet)
        await expect(bob.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )
    }) // end test
})
