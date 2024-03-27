/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { TestConstants } from './helpers/TestConstants'
import { Permission, createExternalTokenStruct, getTestGatingNftAddress } from '@river-build/web3'
import { RoleIdentifier } from '../../src/types/web3-types'

describe('channel with roles and permissions', () => {
    test('join token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { alice } = await registerAndStartClients(['alice'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])) as string

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string

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
        ])) as string

        // create a channel with the same roles and permissions as the space
        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })) as string

        /** Act */

        // join the channel
        await bob.joinTown(spaceId, bob.wallet)
        await waitForWithRetries(() => bob.joinRoom(channelId))
    }) // end test

    test('denied access to token-gated channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])) as string

        const testGatingNftAddress = await getTestGatingNftAddress(alice.chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        const ruleData = createExternalTokenStruct([testGatingNftAddress])

        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            'newRoleName',
            [Permission.Read, Permission.Write],
            [],
            ruleData,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }

        const channelId = (await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [roleIdentifier.roleId],
        })) as string

        /** Act & Assert */

        // join the channel
        await bob.joinTown(spaceId, bob.wallet)
        await expect(bob.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )
    }) // end test
})
