/**
 * @group core
 */
import {
    createTestSpaceGatedByTownsNfts,
    registerAndStartClient,
    registerAndStartClients,
    waitForWithRetries,
} from 'use-towns-client/tests/integration/helpers/TestUtils'

import { RoleIdentifier } from '../../src/types/web3-types'
import { TestConstants } from './helpers/TestConstants'
import { getAccountAddress } from '../../src/types/user-identifier'
import {
    createExternalNFTStruct,
    getTestGatingNftAddress,
    NoopRuleData,
    Permission,
} from '@river-build/web3'
import { TownsTestWeb3Provider } from './helpers/TownsTestWeb3Provider'
import { getTransactionHashFromTransactionOrUserOp } from '@towns/userops'

// TODO: this test uses createTestSpaceGatedByTownNfts. skipping for now b/c createTestSpaceGatedByTownNfts needs more xchain work
describe('isEntitledToSpace and isEntitledToChannel tests', () => {
    test.skip('server checks isEntitledToSpace true', async () => {
        /** Arrange */
        // create all the users for the test
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const bobUserId = bobWithNft.getUserId()
        const { alice } = await registerAndStartClients(['alice'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        // invite user to join the town
        await alice.inviteUser(spaceId, bobUserId)

        /** Act */
        // join the town
        const roomId = await bobWithNft.joinTown(spaceId, bobWithNft.wallet)

        /** Assert */
        expect(roomId).toBeDefined()
    }) // end test

    test.skip('server checks isEntitledToSpace false', async () => {
        /** Arrange */
        // create all the users for the test
        console.time('registerAndStartClients')
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        console.timeLog('registerAndStartClients')
        // create a space with token entitlement to read & write
        console.time('fundWallet')
        await Promise.all([alice.fundWallet(), bob.fundWallet()])
        console.timeLog('fundWallet')
        console.time('createTestSpaceGatedByTownsNfts')
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        expect(spaceId).toBeDefined()
        console.timeLog('createTestSpaceGatedByTownsNfts')

        console.time('inviteUser')
        // invite user to join the town
        if (spaceId) {
            await alice.inviteUser(spaceId, bob.getUserId())
        } else {
            throw new Error('spaceId is undefined')
        }
        console.timeLog('inviteUser')

        console.time('joinTown')
        await expect(async () => await bob.joinTown(spaceId, bob.wallet)).rejects.toThrowError(
            'execution reverted',
        )

        console.timeLog('joinTown')
    }) // end test

    test.skip('server checks isEntitledToChannel true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )

        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }

        const ruleData = createExternalNFTStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, permissions)
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId,
            `newRole${Date.now()}`,
            permissions,
            users,
            ruleData,
        )) as RoleIdentifier
        const channelId = await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roles: [roleId.roleId].map((roleId) => ({ roleId, permissions: [] })),
            },
            alice.provider.wallet,
        )

        /** Act */
        /** Assert */
        // join the town. let the server enforce the channel entitlement check
        await waitForWithRetries(() => bobWithNft.joinRoom(channelId, spaceId))
    }) // end test

    test.skip('server checks isEntitledToChannel false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }

        const ruleData = createExternalNFTStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, permissions)
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId,
            `newRole${Date.now()}`,
            permissions,
            users,
            ruleData,
        )) as RoleIdentifier
        const channelId = await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roles: [roleId.roleId].map((roleId) => ({ roleId, permissions: [] })),
            },
            alice.provider.wallet,
        )

        /** Act */
        // join the town. let the server enforce the channel entitlement check
        /** Assert */
        await expect(bob.joinRoom(channelId, spaceId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )
    }) // end test

    test('client checks isEntitledToSpace true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        expect(spaceId).toBeDefined()
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }

        const { issued } = await bobWithNft.spaceDapp.joinSpace(
            spaceId,
            bobWithNft.wallet.address,
            bobWithNft.wallet,
        )

        expect(issued).toBeTruthy()
        /** Act */
        const isAliceEntitledToSpace = await alice.isEntitled(
            spaceId,
            undefined,
            alice.wallet.address,
            Permission.JoinSpace,
        )
        /** Assert */
        expect(isAliceEntitledToSpace).toBe(true)
        // test the user's entitlement to the space
        const isEntitledToSpace = await bobWithNft.isEntitled(
            spaceId,
            undefined,
            bobWithNft.wallet.address,
            Permission.JoinSpace,
        )

        /** Assert */
        expect(isEntitledToSpace).toBe(true)
    }) // end test

    test('client checks isEntitledToJoinSpace with a linked wallet is true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const metamaskWalletWithGatingNFT = await TestConstants.getWalletWithTestGatingNft()

        // bob must have funds to link the wallet
        const tx_link = await bob.linkEOAToRootKey(bob.provider.wallet, metamaskWalletWithGatingNFT)

        const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)

        if (txHash) {
            await bob.opts.baseProvider?.waitForTransaction(txHash)
        }
        expect(tx_link.error).toBeUndefined()
        expect(txHash).toBeDefined()

        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        expect(spaceId).toBeDefined()

        /** Act */
        const isAliceEntitledToSpace = await alice.isEntitled(
            spaceId,
            undefined,
            alice.wallet.address,
            Permission.JoinSpace,
        )
        /** Assert */
        expect(isAliceEntitledToSpace).toBe(true)

        // test the user's entitlement to the space
        const isEntitledToJoinSpace = await bob.isEntitled(
            spaceId,
            undefined,
            bob.wallet.address,
            Permission.JoinSpace,
        )

        /** Assert */
        expect(isEntitledToJoinSpace).toBe(true)
    }) // end test

    test('client checks isEntitledToJoinSpace with a linked wallet is false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        const metamaskWalletWithoutGatingNft = await new TownsTestWeb3Provider().fundWallet()

        // bob must have funds to link the wallet
        const tx_link = await bob.linkEOAToRootKey(
            bob.provider.wallet,
            metamaskWalletWithoutGatingNft,
        )
        const txHash = await getTransactionHashFromTransactionOrUserOp(tx_link.transaction)

        if (txHash) {
            await bob.opts.baseProvider?.waitForTransaction(txHash)
        }
        expect(tx_link.error).toBeUndefined()
        expect(txHash).toBeDefined()

        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        expect(spaceId).toBeDefined()

        /** Act */
        const isAliceEntitledToSpace = await alice.isEntitled(
            spaceId,
            undefined,
            alice.wallet.address,
            Permission.JoinSpace,
        )
        /** Assert */
        expect(isAliceEntitledToSpace).toBe(true)

        // test the user's entitlement to the space
        const isEntitledToJoinSpace = await bob.isEntitled(
            spaceId,
            undefined,
            bob.wallet.address,
            Permission.JoinSpace,
        )

        /** Assert */
        expect(isEntitledToJoinSpace).toBe(false)
    }) // end test

    test('client checks isEntitledToSpace false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // convert bob's userId into its wallet address
        const bobUserId = bob.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId) ?? ''
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToSpace = await bob.isEntitled(
            spaceId,
            undefined,
            bobAccountAddress,
            Permission.JoinSpace,
        )

        /** Assert */
        expect(isEntitledToSpace).toBe(false)
    }) // end test

    test('client checks isEntitledToChannel true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )
        // convert bob's userId into its wallet address
        const bobUserId = bobWithNft.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId) ?? ''
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }

        const ruleData = createExternalNFTStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, permissions)
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId,
            `newRole${Date.now()}`,
            permissions,
            users,
            ruleData,
        )) as RoleIdentifier
        const channelId = await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roles: [roleId.roleId].map((roleId) => ({ roleId, permissions: [] })),
            },
            alice.provider.wallet,
        )

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToChannel = await bobWithNft.isEntitled(
            spaceId,
            channelId,
            bobAccountAddress,
            Permission.Read,
        )

        /** Assert */
        expect(isEntitledToChannel).toBe(true)
    }) // end test

    test('client checks isEntitledToChannel false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // convert bob's userId into its wallet address
        const bobUserId = bob.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId) ?? ''
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = await getTestGatingNftAddress(alice.opts.baseChainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        const ruleData = createExternalNFTStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, permissions)
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId,
            `newRole${Date.now()}`,
            permissions,
            users,
            ruleData,
        )) as RoleIdentifier
        const channelId = await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roles: [roleId.roleId].map((roleId) => ({ roleId, permissions: [] })),
            },
            alice.provider.wallet,
        )

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToChannel = await bob.isEntitled(
            spaceId,
            channelId,
            bobAccountAddress,
            Permission.Read,
        )

        /** Assert */
        expect(isEntitledToChannel).toBe(false)
    }) // end test

    test('client checks isEntitledToChannel starts false, becomes true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )
        // convert bob's userId into its wallet address
        const bobUserId = bobWithNft.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId) ?? ''
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownsNfts(alice, permissions)
        const roleName = `newRole${Date.now()}`
        // create a channel with token entitlement to read & write
        const roleId = await alice.createRole(spaceId, roleName, permissions, users, NoopRuleData)

        expect(roleId).toBeDefined()
        const channelId = await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roles: [roleId!.roleId].map((roleId) => ({ roleId, permissions: [] })),
            },
            alice.provider.wallet,
        )

        expect(channelId).toBeDefined()

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToChannel = await bobWithNft.isEntitled(
            spaceId,
            channelId,
            bobAccountAddress,
            Permission.Read,
        )

        /** Assert */
        expect(isEntitledToChannel).toBe(false)

        const transaction = await alice.updateRoleTransaction(
            spaceId,
            roleId!.roleId,
            roleName,
            permissions,
            [bobAccountAddress],
            NoopRuleData,
            alice.provider.wallet,
        )

        await alice.waitForUpdateRoleTransaction(transaction)

        // Wait a bit for the TTL on the entitlements cache to expire in the client
        await new Promise((resolve) => setTimeout(resolve, 5000))

        /** Act */
        // test the user's entitlement to the space
        const isNowEntitledToChannel = await bobWithNft.isEntitled(
            spaceId,
            channelId,
            bobAccountAddress,
            Permission.Read,
        )

        expect(isNowEntitledToChannel).toBe(true)
    }) // end test
})
