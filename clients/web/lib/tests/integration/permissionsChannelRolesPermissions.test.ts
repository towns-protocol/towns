/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import {
    createTestChannelWithSpaceRoles,
    createGatedChannel,
    createTestSpaceGatedByTownNft,
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    registerAndStartClient,
    waitForWithRetries,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { TestConstants } from './helpers/TestConstants'
import {
    Permission,
    createExternalNFTStruct,
    getTestGatingNftAddress,
    NoopRuleData,
} from '@river-build/web3'
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
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        // create a channel with the same roles and permissions as the space
        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

        /** Act */

        // join the channel
        await tokenGrantedUser.joinTown(spaceId, tokenGrantedUser.wallet)
        await waitForWithRetries(() => tokenGrantedUser.joinRoom(channelId))
    }) // end test

    test('join token-gated channel with asset in linked wallet', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        await bob.fundWallet()
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        const ruleData = createExternalNFTStruct([
            await getTestGatingNftAddress(bob.opts.baseChainId),
        ])

        // create a channel gated by the test nft token
        const channelId = await createGatedChannel(
            bob,
            {
                name: 'gated channel',
                parentSpaceId: spaceId,
                roleIds: [],
            },
            [],
            ruleData,
        )

        /** Act */

        // Alice joins the town
        await alice.joinTown(spaceId, alice.wallet)

        // Alice cannot join the channel
        await expect(alice.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )

        const tx = await alice.linkCallerToRootKey(
            alice.provider.wallet,
            tokenGrantedUser.provider.wallet,
        )
        await alice.waitWalletLinkTransaction(tx)

        await waitForWithRetries(() => alice.joinRoom(channelId))
    }) // end test

    test('join token-gated channel with asset in root key wallet', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        await bob.fundWallet()
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        const ruleData = createExternalNFTStruct([
            await getTestGatingNftAddress(bob.opts.baseChainId),
        ])

        // create a channel gated by the test nft token
        const channelId = await createGatedChannel(
            bob,
            {
                name: 'gated channel',
                parentSpaceId: spaceId,
                roleIds: [],
            },
            [],
            ruleData,
        )

        /** Act */

        // Alice joins the town
        await alice.joinTown(spaceId, alice.wallet)

        // Alice cannot join the channel
        await expect(alice.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )

        const tx = await tokenGrantedUser.linkCallerToRootKey(
            tokenGrantedUser.provider.wallet,
            alice.provider.wallet,
        )
        await tokenGrantedUser.waitWalletLinkTransaction(tx)

        await waitForWithRetries(() => alice.joinRoom(channelId))
    }) // end test

    test('join Everyone channel', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])

        // create a channel with the same roles and permissions as the space
        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

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
        const spaceId = await createTestSpaceGatedByTownNft(alice, [
            Permission.Read,
            Permission.Write,
        ])

        const testGatingNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        const ruleData = createExternalNFTStruct([testGatingNftAddress])

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

        const channelId = await createTestChannelWithSpaceRoles(alice, {
            name: 'alice channel',
            parentSpaceId: spaceId,
            roleIds: [roleIdentifier.roleId],
        })

        /** Act & Assert */

        // join the channel
        await bob.joinTown(spaceId, bob.wallet)
        await expect(bob.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )
    }) // end test

    test('join user-gated channel with linked wallet address', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])
        // create a space with token entitlement to read & write
        await bob.fundWallet()
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        // create a channel gated by the test nft token
        const channelId = await createGatedChannel(
            bob,
            {
                name: 'gated channel',
                parentSpaceId: spaceId,
                roleIds: [],
            },
            [carol.wallet.address],
            NoopRuleData,
        )

        /** Act */

        // Alice joins the town
        await alice.joinTown(spaceId, alice.wallet)

        // Alice cannot join the channel
        await expect(alice.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )

        const tx = await alice.linkCallerToRootKey(alice.provider.wallet, carol.provider.wallet)
        await alice.waitWalletLinkTransaction(tx)

        await waitForWithRetries(() => alice.joinRoom(channelId))
    }) // end test

    test('after entitlement loss, user message send fails', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])
        // create a space with token entitlement to read & write
        await bob.fundWallet()
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        // create a channel gated by the test nft token
        const channelId = await createGatedChannel(
            bob,
            {
                name: 'gated channel',
                parentSpaceId: spaceId,
                roleIds: [],
            },
            [carol.wallet.address],
            NoopRuleData,
        )

        /** Act */

        // link alice and carol wallets
        const txn = await alice.linkCallerToRootKey(alice.provider.wallet, carol.provider.wallet)
        await alice.waitWalletLinkTransaction(txn)

        // Alice joins the town
        await alice.joinTown(spaceId, alice.wallet)

        await alice.joinRoom(channelId)

        // Remove the link between alice and carol wallets, causing Alice to lose her entitlement to the channel.
        const tx = await alice.removeLink(alice.provider.wallet, carol.wallet.address)
        await alice.waitWalletLinkTransaction(tx)

        // Await 5s for cached entitlement to be cleared on the stream server.
        // The subsequent message send should fail.
        await new Promise((f) => setTimeout(f, 5000))

        // Have alice attempt to send a message to the channel after losing her entitlement
        // to the channel. Her message should be rejected by the client.
        await expect(
            alice.sendMessage(channelId, 'hello'),
        ).rejects.toThrow(/*not entitled to add message to channel*/)
    }) // end test

    test('join token-gated channel as linked wallet with root key whitelisted', async () => {
        /** Arrange */

        // create all the users for the test
        const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])

        // create a space with token entitlement to read & write
        await bob.fundWallet()
        const spaceId = await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])

        // create a channel gated by the test nft token
        const channelId = await createGatedChannel(
            bob,
            {
                name: 'gated channel',
                parentSpaceId: spaceId,
                roleIds: [],
            },
            [carol.wallet.address],
            NoopRuleData,
        )

        /** Act */

        // Alice joins the town
        await alice.joinTown(spaceId, alice.wallet)

        // Alice cannot join the channel
        await expect(alice.joinRoom(channelId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )

        const txn = await carol.linkCallerToRootKey(carol.provider.wallet, alice.provider.wallet)
        await carol.waitWalletLinkTransaction(txn)

        await waitForWithRetries(() => alice.joinRoom(channelId))
    }) // end test
})
