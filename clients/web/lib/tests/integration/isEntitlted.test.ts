/**
 * @group casablanca
 */
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClient,
    registerAndStartClients,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { RoleIdentifier } from '../../src/types/web3-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { getAccountAddress } from '../../src/types/user-identifier'
import {
    createExternalTokenStruct,
    getTestGatingNftAddress,
    Permission,
    TokenEntitlementDataTypes,
} from '@river/web3'

describe('isEntitledToSpace and isEntitledToChannel tests', () => {
    test('server checks isEntitledToSpace true', async () => {
        /** Arrange */
        // create all the users for the test
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithMemberNft(),
        )
        const bobUserId = bobWithNft.getUserId() as string
        const { alice } = await registerAndStartClients(['alice'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        // invite user to join the town
        await alice.inviteUser(spaceId, bobUserId)

        /** Act */
        // join the town
        const roomId = await bobWithNft.joinTown(spaceId, bobWithNft.wallet)

        /** Assert */
        expect(roomId).toBeDefined()
    }) // end test

    test('server checks isEntitledToSpace false', async () => {
        /** Arrange */
        // create all the users for the test
        console.time('registerAndStartClients')
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        console.timeLog('registerAndStartClients')
        // create a space with token entitlement to read & write
        console.time('fundWallet')
        await Promise.all([alice.fundWallet(), bob.fundWallet()])
        console.timeLog('fundWallet')
        console.time('createTestSpaceGatedByTownAndZionNfts')
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        expect(spaceId).toBeDefined()
        console.timeLog('createTestSpaceGatedByTownAndZionNfts')

        console.time('inviteUser')
        // invite user to join the town
        await alice.inviteUser(spaceId!, bob.getUserId() as string)
        console.timeLog('inviteUser')

        console.time('joinTown')
        await expect(async () => await bob.joinTown(spaceId!, bob.wallet)).rejects.toThrowError(
            'execution reverted',
        )

        console.timeLog('joinTown')
    }) // end test

    test('server checks isEntitledToChannel true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithMemberNft(),
        )
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }

        const tokens = createExternalTokenStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            alice,
            permissions,
        )) as RoomIdentifier
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId.networkId,
            `newRole${Date.now()}`,
            permissions,
            tokens,
            users,
        )) as RoleIdentifier
        const channelId = (await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roleIds: [roleId.roleId],
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /** Act */
        /** Assert */
        // join the town. let the server enforce the channel entitlement check
        await waitForWithRetries(() => bobWithNft.joinRoom(channelId, spaceId.networkId))
    }) // end test

    test('server checks isEntitledToChannel false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }

        const tokens = createExternalTokenStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            alice,
            permissions,
        )) as RoomIdentifier
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId.networkId,
            `newRole${Date.now()}`,
            permissions,
            tokens,
            users,
        )) as RoleIdentifier
        const channelId = (await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roleIds: [roleId.roleId],
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /** Act */
        // join the town. let the server enforce the channel entitlement check
        /** Assert */
        await expect(bob.joinRoom(channelId, spaceId.networkId)).rejects.toThrow(
            new RegExp('Unauthorised|permission_denied'),
        )
    }) // end test

    test('client checks isEntitledToSpace true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithMemberNft(),
        )
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])

        const transaction = await bobWithNft.spaceDapp.joinTown(
            spaceId!.networkId,
            bobWithNft.wallet.address,
            bobWithNft.wallet,
        )

        const receipt = await transaction.wait()
        expect(receipt.status).toBe(1)
        /** Act */
        const isAliceEntitledToSpace = await alice.isEntitled(
            spaceId!.networkId,
            undefined,
            alice.wallet.address,
            Permission.Read,
        )
        /** Assert */
        expect(isAliceEntitledToSpace).toBe(true)
        // test the user's entitlement to the space
        const isEntitledToSpace = await bobWithNft.isEntitled(
            spaceId!.networkId,
            undefined,
            bobWithNft.wallet.address,
            Permission.Read,
        )

        /** Assert */
        expect(isEntitledToSpace).toBe(true)
    }) // end test

    test('client checks isEntitledToSpace false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // convert bob's userId into its wallet address
        const bobUserId = bob.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId as string) ?? ''
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToSpace = await bob.isEntitled(
            spaceId.networkId,
            undefined,
            bobAccountAddress,
            Permission.Read,
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
            TestConstants.getWalletWithMemberNft(),
        )
        // convert bob's userId into its wallet address
        const bobUserId = bobWithNft.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId as string) ?? ''
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }

        const tokens = createExternalTokenStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            alice,
            permissions,
        )) as RoomIdentifier
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId.networkId,
            `newRole${Date.now()}`,
            permissions,
            tokens,
            users,
        )) as RoleIdentifier
        const channelId = (await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roleIds: [roleId.roleId],
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToChannel = await bobWithNft.isEntitled(
            spaceId.networkId,
            channelId.networkId,
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
        const bobAccountAddress = getAccountAddress(bobUserId as string) ?? ''
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const testGatingNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!testGatingNftAddress) {
            throw new Error('testGatingNftAddress is undefined')
        }
        const tokens = createExternalTokenStruct([testGatingNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            alice,
            permissions,
        )) as RoomIdentifier
        // create a channel with token entitlement to read & write
        const roleId: RoleIdentifier | undefined = (await alice.createRole(
            spaceId.networkId,
            `newRole${Date.now()}`,
            permissions,
            tokens,
            users,
        )) as RoleIdentifier
        const channelId = (await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roleIds: [roleId.roleId],
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToChannel = await bob.isEntitled(
            spaceId.networkId,
            channelId.networkId,
            bobAccountAddress,
            Permission.Read,
        )

        /** Assert */
        expect(isEntitledToChannel).toBe(false)
    }) // end test

    test('client checks isEntitledToChannel starts fales, becomes true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithMemberNft(),
        )
        // convert bob's userId into its wallet address
        const bobUserId = bobWithNft.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId as string) ?? ''
        // create a space with token entitlement to read & write
        const permissions = [Permission.Read, Permission.Write]
        const tokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = [] // createExternalTokenStruct([testGatingNftAddress!])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceGatedByTownAndZionNfts(
            alice,
            permissions,
        )) as RoomIdentifier
        const roleName = `newRole${Date.now()}`
        // create a channel with token entitlement to read & write
        const roleId = await alice.createRole(
            spaceId.networkId,
            roleName,
            permissions,
            tokens,
            users,
        )

        expect(roleId).toBeDefined()
        const channelId = await alice.createChannel(
            {
                name: `aliceChannel${Date.now()}`,
                parentSpaceId: spaceId,
                roleIds: [roleId!.roleId],
            },
            alice.provider.wallet,
        )

        expect(channelId).toBeDefined()

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToChannel = await bobWithNft.isEntitled(
            spaceId.networkId,
            channelId!.networkId,
            bobAccountAddress,
            Permission.Read,
        )

        /** Assert */
        expect(isEntitledToChannel).toBe(false)

        await alice.updateRoleTransaction(
            spaceId.networkId,
            roleId!.roleId,
            roleName,
            permissions,
            tokens,
            [bobAccountAddress],
            alice.provider.wallet,
        )
        /** Act */
        // test the user's entitlement to the space
        const isNowEntitledToChannel = await bobWithNft.isEntitled(
            spaceId.networkId,
            channelId!.networkId,
            bobAccountAddress,
            Permission.Read,
        )
        // Wait a bit for the TTL on the cache to expire, currently set to 2s in auth_impl_cache.go
        await new Promise((resolve) => setTimeout(resolve, 2000))

        expect(isNowEntitledToChannel).toBe(true)
    }) // end test
})
