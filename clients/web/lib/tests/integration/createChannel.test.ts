/**
 * @group dendrite
 * @grouo casablanca
 */
import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import { createTestSpaceWithZionMemberRole, registerAndStartClients } from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { getFilteredRolesFromSpace } from '../../src/client/web3/ContractHelpers'

describe('On-chain channel creation tests', () => {
    test('create channel with no roles', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        let channel: RoomIdentifier | undefined

        /* Act */
        if (roomId) {
            // create a channel on-chain with no roles
            channel = await alice.createChannel(
                {
                    name: 'test_channel',
                    visibility: RoomVisibility.Public,
                    parentSpaceId: roomId,
                    roleIds: [],
                },
                alice.provider.wallet,
            )
        }

        /* Assert */
        expect(channel).toBeDefined()
    })

    test('create channel with roles from space', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = (await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        /* Act */
        // create a channel on-chain with roles from the space
        const roleIds: number[] = []
        const allowedRoles = await getFilteredRolesFromSpace(alice, roomId.networkId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId.toNumber())
        }
        const channel = (await alice.createChannel(
            {
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
                roleIds,
            },
            alice.provider.wallet,
        )) as RoomIdentifier

        /* Assert */
        expect(channel?.networkId).toBeTruthy()
    })

    test('reject create channel with duplicate roles', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const roomId = (await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        /* Act */
        // create a channel on-chain with roles from the space
        const roleIds: number[] = []
        const allowedRoles = await getFilteredRolesFromSpace(alice, roomId.networkId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId.toNumber())
            // Duplicate the role
            roleIds.push(r.roleId.toNumber())
        }

        const error = await getError<Error>(async function () {
            await alice.createChannel(
                {
                    name: 'test_channel',
                    visibility: RoomVisibility.Public,
                    parentSpaceId: roomId,
                    roleIds,
                },
                alice.provider.wallet,
            )
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', CONTRACT_ERROR.AddRoleFailed)
    })
})
