/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { MAXTRIX_ERROR, MatrixError, NoThrownError, getError } from './helpers/ErrorUtils'
import { Room, RoomVisibility } from '../../src/types/zion-types'
import {
    createExternalTokenStruct,
    getMemberNftAddress,
} from '../../src/client/web3/ContractHelpers'
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { ContractReceipt } from 'ethers'
import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoleIdentifier } from '../../src/types/web3-types'
import { SpaceFactoryDataTypes } from '../../src/client/web3/shims/SpaceFactoryShim'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/react'

describe('delete role', () => {
    test('delete token-gated role with a channel using it', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithNft(),
        )
        if (!bobWithNft.walletAddress) {
            throw new Error('bobWithNft.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newNftAddress = getMemberNftAddress(alice.chainId)
        const newTokens = createExternalTokenStruct([newNftAddress])
        const newUsers: string[] = []
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.networkId
        // create a new role
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            newRoleName,
            newPermissions,
            newTokens,
            newUsers,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }
        console.log('!!!! new role created: ', { roleIdentifier })
        const roleId = roleIdentifier.roleId
        // create a channel with the role
        const channel = await alice.createChannel({
            name: 'test_channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: roomId,
            roleIds: [roleId],
        })
        if (!channel) {
            throw new Error('channel is undefined')
        }
        // sanity check: bob joins the space successfully
        await bobWithNft.joinRoom(channel, spaceId)
        // bob leaves the room so that we can delete the role, and test
        // that bob can no longer join the room
        await bobWithNft.leave(channel, spaceId)

        await waitFor(() => expect(bobWithNft.getRoomData(channel)?.membership).not.toBe('join'))

        /** Act */
        let receipt: ContractReceipt | undefined
        let rejoinedRoom: Room | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(spaceId, roleIdentifier.roleId)
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }
        // bob tries to join the room again
        // expect that bob cannot join the room
        const error = await getError<MatrixError>(async function () {
            rejoinedRoom = await bobWithNft.joinRoom(channel, spaceId)
        })

        console.log("!!!! bobWithNft's done trying to join !!!", {
            error,
            spaceId,
            channelId: channel.networkId,
            receipt,
            rejoinedRoom,
        })
        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verify bob cannot join the room
        expect(rejoinedRoom).toBeUndefined()
        // verify error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', MAXTRIX_ERROR.M_FORBIDDEN)
        // verify role is deleted
        const actual = await alice.spaceDapp.getRole(spaceId, roleId)
        expect(actual).toBeNull()
        // verify bob is still entitled to the space
        expect(
            await bobWithNft.spaceDapp.isEntitledToSpace(
                spaceId,
                bobWithNft.walletAddress,
                Permission.Read,
            ),
        ).toBe(true)
        // verify bob is no longer entitled to the channel
        expect(
            await bobWithNft.spaceDapp.isEntitledToChannel(
                spaceId,
                channel.networkId,
                bobWithNft.walletAddress,
                Permission.Read,
            ),
        ).toBe(false)
    })

    test('delete user-gated role with a channel using it', async () => {
        /** Arrange */
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        if (!bob.walletAddress) {
            throw new Error('bob.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newTokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        // add bob to the users list
        const newUsers: string[] = [bob.walletAddress]
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.networkId
        // create a new role
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            newRoleName,
            newPermissions,
            newTokens,
            newUsers,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }
        console.log('!!! roleIdentifier', { roleIdentifier })
        const roleId = roleIdentifier.roleId
        // create a channel with the role
        const channel = await alice.createChannel({
            name: 'test_channel',
            visibility: RoomVisibility.Public,
            parentSpaceId: roomId,
            roleIds: [roleId],
        })
        if (!channel) {
            throw new Error('channel is undefined')
        }
        // sanity check: bob joins the space successfully
        await bob.joinRoom(channel, spaceId)
        // bob leaves the room so that we can delete the role, and test
        // that bob can no longer join the room
        await bob.leave(channel, spaceId)

        await waitFor(() => expect(bob.getRoomData(channel)?.membership).not.toBe('join'))

        /** Act */
        let receipt: ContractReceipt | undefined
        let rejoinedRoom: Room | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(spaceId, roleIdentifier.roleId)
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }
        // bob tries to join the room again
        // expect that bob cannot join the room
        const error = await getError<MatrixError>(async function () {
            rejoinedRoom = await bob.joinRoom(channel, spaceId)
        })

        console.log("!!!! bob's done trying to join !!!", {
            error,
            spaceId,
            channelId: channel.networkId,
            receipt,
            rejoinedRoom,
        })
        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verfy bob cannot join the room
        expect(rejoinedRoom).toBeUndefined()
        // verify error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        expect(error).toHaveProperty('name', MAXTRIX_ERROR.M_FORBIDDEN)
        // verify role is deleted
        const actual = await alice.spaceDapp.getRole(spaceId, roleId)
        expect(actual).toBeNull()
        // verify bob is not entitled to the space
        expect(
            await bob.spaceDapp.isEntitledToSpace(spaceId, bob.walletAddress, Permission.Read),
        ).toBe(false)
        // verify bob is no longer entitled to the channel
        expect(
            await bob.spaceDapp.isEntitledToChannel(
                spaceId,
                channel.networkId,
                bob.walletAddress,
                Permission.Read,
            ),
        ).toBe(false)
    })

    test('delete a role with no channels using it', async () => {
        /** Arrange */
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        if (!alice.walletAddress) {
            throw new Error('alice.walletAddress is undefined')
        }
        if (!bob.walletAddress) {
            throw new Error('bob.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newTokens: SpaceFactoryDataTypes.ExternalTokenStruct[] = []
        // add bob to the users list
        const newUsers: string[] = [bob.walletAddress]
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceWithZionMemberRole(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.networkId
        // create a new role
        const roleIdentifier: RoleIdentifier | undefined = await alice.createRole(
            spaceId,
            newRoleName,
            newPermissions,
            newTokens,
            newUsers,
        )
        if (!roleIdentifier) {
            throw new Error('roleIdentifier is undefined')
        }
        const roleId = roleIdentifier.roleId

        /** Act */
        let receipt: ContractReceipt | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(spaceId, roleIdentifier.roleId)
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }

        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verify role is deleted
        const actual = await alice.spaceDapp.getRole(spaceId, roleId)
        expect(actual).toBeNull()
        // verify alice is not affected
        expect(
            await alice.spaceDapp.isEntitledToSpace(spaceId, alice.walletAddress, Permission.Read),
        ).toBe(true)
        expect(
            await alice.spaceDapp.isEntitledToSpace(spaceId, alice.walletAddress, Permission.Write),
        ).toBe(true)
        // verify bob is not entitled to the space
        expect(
            await bob.spaceDapp.isEntitledToSpace(spaceId, bob.walletAddress, Permission.Read),
        ).toBe(false)
    })
})
