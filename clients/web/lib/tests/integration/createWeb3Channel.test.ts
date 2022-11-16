import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import { createTestSpaceWithEntitlement, registerAndStartClients } from './helpers/TestUtils'

import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { getRolesFromSpace } from '../../src/client/web3/ContractDataFactory'
import { CONTRACT_ERROR, getError, NoThrownError } from './helpers/ErrorUtils'

describe('On-chain channel creation tests', () => {
    jest.setTimeout(30000)
    test('create channel with no roles', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = await createTestSpaceWithEntitlement(
            alice,
            [readPermission, writePermission],
            [],
        )
        let channel: RoomIdentifier | undefined

        /* Act */
        if (roomId) {
            // create a channel on-chain with no roles
            channel = await alice.createWeb3Channel({
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
                roleIds: [],
            })
        }

        /* Assert */
        expect(channel).toBeDefined()
    })

    test('create channel with roles from space', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = (await createTestSpaceWithEntitlement(
            alice,
            [readPermission, writePermission],
            [],
        )) as RoomIdentifier

        /* Act */
        // create a channel on-chain with roles from the space
        const roleIds: number[] = []
        const allowedRoles = await getRolesFromSpace(alice, roomId.matrixRoomId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId.toNumber())
        }
        const channel = await alice.createWeb3Channel({
            name: 'test_channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: roomId,
            roleIds,
        })

        /* Assert */
        expect(channel).toBeDefined()
    })

    test('reject create channel with duplicate roles', async () => {
        /* Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        // create a space with token entitlement to write
        const readPermission: DataTypes.PermissionStruct = { name: Permission.Read }
        const writePermission: DataTypes.PermissionStruct = { name: Permission.Write }

        const roomId = (await createTestSpaceWithEntitlement(
            alice,
            [readPermission, writePermission],
            [],
        )) as RoomIdentifier

        /* Act */
        // create a channel on-chain with roles from the space
        const roleIds: number[] = []
        const allowedRoles = await getRolesFromSpace(alice, roomId.matrixRoomId)
        for (const r of allowedRoles) {
            roleIds.push(r.roleId.toNumber())
            // Duplicate the role
            roleIds.push(r.roleId.toNumber())
        }

        const error = await getError<Error>(async function () {
            await alice.createWeb3Channel({
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
                roleIds,
            })
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', CONTRACT_ERROR.AddRoleFailed)
    })
})
