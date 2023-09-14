/**
 * @group dendrite
 * @group casablanca
 */
import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import { createTestSpaceWithZionMemberRole, registerAndStartClients } from './helpers/TestUtils'

import { RoomIdentifier } from '../../src/types/room-identifier'
import { RoomVisibility } from '../../src/types/zion-types'
import { getFilteredRolesFromSpace, Permission } from '@river/web3'

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
        const allowedRoles = await getFilteredRolesFromSpace(alice.spaceDapp, roomId.networkId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId)
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
        const allowedRoles = await getFilteredRolesFromSpace(alice.spaceDapp, roomId.networkId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId)
            // Duplicate the role
            roleIds.push(r.roleId)
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
        expect(error).toHaveProperty('name')
        expect(error.name).toMatch(
            new RegExp(`${CONTRACT_ERROR.AddRoleFailed}|${CONTRACT_ERROR.RoleAlreadyExists}`),
        )
    })
})
