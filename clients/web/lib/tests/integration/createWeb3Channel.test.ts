import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import { createTestSpaceWithEntitlement, registerAndStartClients } from './helpers/TestUtils'

import { DataTypes } from '../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { getRolesFromSpace } from '../../src/client/web3/ContractDataFactory'

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

    // https://linear.app/hnt-labs/issue/HNT-427/create-channel-with-owner-role-should-be-rejected
    test.skip('reject create channel with Owner role', async () => {
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
        // create a channel on-chain with Owner role
        const roleIds: number[] = []
        const allowedRoles = await getRolesFromSpace(alice, roomId.matrixRoomId)
        for (const r of allowedRoles) {
            if (r.name === 'Owner') {
                roleIds.push(r.roleId.toNumber())
            }
        }

        /* Assert */
        await expect(
            alice.createWeb3Channel({
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
                roleIds,
            }),
        ).rejects.toThrow()
    })

    // https://linear.app/hnt-labs/issue/HNT-428/create-channel-with-duplicate-role-should-be-reverted
    test.skip('reject create channel with duplicate roles', async () => {
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

        /* Assert */
        await expect(
            alice.createWeb3Channel({
                name: 'test_channel',
                visibility: RoomVisibility.Public,
                parentSpaceId: roomId,
                roleIds,
            }),
        ).rejects.toThrow()
    })
})
