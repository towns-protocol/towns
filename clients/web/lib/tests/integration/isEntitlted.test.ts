import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClient,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestClientProps } from './helpers/ZionTestClient'
import { createUserIdFromString } from '../../src/types/user-identifier'

describe.skip('isEntitledToSpace and isEntitledToChannel tests', () => {
    const withTestProps: ZionTestClientProps = {
        smartContractVersion: 'v3', // use v3 for the new TownArchitect. work-in-progress.
    }

    test('server returns isEntitledToSpace true', async () => {
        /** Arrange */
        // create all the users for the test
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithMemberNft(),
            withTestProps,
        )
        const bobUserId = bobWithNft.getUserId() as string
        const { alice } = await registerAndStartClients(['alice'], withTestProps)
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

    test('server returns isEntitledToSpace false', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], withTestProps)
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

    test('client checks isEntitledToSpace true', async () => {
        /** Arrange */
        // create all the users for the test
        const { alice } = await registerAndStartClients(['alice'], withTestProps)
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithMemberNft(),
            withTestProps,
        )
        // convert bob's userId into its wallet address
        const bobUserId = bobWithNft.getUserId()
        const bobAccountAddress = createUserIdFromString(bobUserId as string)
            ?.accountAddress as string
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
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], withTestProps)
        // convert bob's userId into its wallet address
        const bobUserId = bob.getUserId()
        const bobAccountAddress = createUserIdFromString(bobUserId as string)
            ?.accountAddress as string
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
})
