import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClient,
    registerAndStartClients,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { RoleIdentifier } from '../../src/types/web3-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'
import { getAccountAddress } from '../../src/types/user-identifier'
import { createExternalTokenStruct, getMemberNftAddress, Permission } from '@river/web3'

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
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

        // invite user to join the town
        await alice.inviteUser(spaceId, bobUserId)

        /** Act */
        // join the town
        const roomId = await bobWithNft.joinRoom(spaceId)

        /** Assert */
        expect(roomId).toBeDefined()
    }) // end test

    test('server checks isEntitledToSpace false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

        // invite user to join the town
        await alice.inviteUser(spaceId, bob.getUserId() as string)

        /** Act */
        /** Assert */
        await expect(bob.joinRoom(spaceId)).rejects.toThrow(
            new RegExp('Unauthorised|PermissionDenied'),
        )
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
        const memberNftAddress = getMemberNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([memberNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            permissions,
            [],
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
                visibility: RoomVisibility.Public,
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
        const memberNftAddress = getMemberNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([memberNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            permissions,
            [],
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
                visibility: RoomVisibility.Public,
                parentSpaceId: spaceId,
                roleIds: [roleId.roleId],
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /** Act */
        // join the town. let the server enforce the channel entitlement check
        /** Assert */
        await expect(bob.joinRoom(channelId, spaceId.networkId)).rejects.toThrow(
            new RegExp('Unauthorised|PermissionDenied'),
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
        // convert bob's userId into its wallet address
        const bobUserId = bobWithNft.getUserId()
        const bobAccountAddress = getAccountAddress(bobUserId as string) ?? ''
        // create a space with token entitlement to read & write
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

        /** Act */
        // test the user's entitlement to the space
        const isEntitledToSpace = await bobWithNft.isEntitled(
            spaceId.networkId,
            undefined,
            bobAccountAddress,
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
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier

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
        const memberNftAddress = getMemberNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([memberNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            permissions,
            [],
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
                visibility: RoomVisibility.Public,
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
        const memberNftAddress = getMemberNftAddress(alice.chainId)
        const tokens = createExternalTokenStruct([memberNftAddress])
        const users: string[] = []
        await alice.fundWallet()
        const spaceId = (await createTestSpaceWithZionMemberRole(
            alice,
            permissions,
            [],
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
                visibility: RoomVisibility.Public,
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
})
