/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group casablanca
 */
import { NoThrownError, getError } from './helpers/ErrorUtils'
import { Room } from '../../src/types/zion-types'
import {
    createTestSpaceGatedByTownAndZionNfts,
    registerAndStartClient,
    registerAndStartClients,
    waitForWithRetries,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { ContractReceipt } from 'ethers'
import { RoleIdentifier } from '../../src/types/web3-types'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/react'
import {
    createExternalTokenStruct,
    getTestGatingNftAddress,
    Permission,
    TokenEntitlementDataTypes,
} from '@river/web3'

describe('delete role', () => {
    test.skip('delete token-gated role with a channel using it', async () => {
        /** Arrange */
        const { alice } = await registerAndStartClients(['alice'])
        const bobWithNft = await registerAndStartClient(
            'bobWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )
        if (!bobWithNft.walletAddress) {
            throw new Error('bobWithNft.walletAddress is undefined')
        }
        const carolWithNft = await registerAndStartClient(
            'carolWithNft',
            TestConstants.getWalletWithTestGatingNft(),
        )
        if (!carolWithNft.walletAddress) {
            throw new Error('carolWithNft.walletAddress is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newNftAddress = getTestGatingNftAddress(alice.chainId)
        if (!newNftAddress) {
            throw new Error('councilNftAddress is undefined')
        }
        const newTokens = createExternalTokenStruct([newNftAddress])
        const newUsers: string[] = []
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.streamId
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
        const channel = await alice.createChannel(
            {
                name: 'test_channel',
                parentSpaceId: roomId,
                roleIds: [roleId],
            },
            alice.provider.wallet,
        )
        if (!channel) {
            throw new Error('channel is undefined')
        }
        // sanity check: bob joins the space successfully
        // have to join and mint b/c down below there is a check to see if bob is entitled to the space
        await bobWithNft.joinTown(roomId, bobWithNft.wallet)
        await waitForWithRetries(() => bobWithNft.joinRoom(channel))
        // bob leaves the room so that we can delete the role, and test
        // that bob can no longer join the room
        await bobWithNft.leave(channel, spaceId)

        await waitFor(() => expect(bobWithNft.getRoomData(channel)?.membership).not.toBe('join'))

        /** Act */
        let receipt: ContractReceipt | undefined
        let rejoinedRoom: Room | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(
                spaceId,
                roleIdentifier.roleId,
                alice.provider.wallet,
            )
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }
        // bob tries to join the room again
        // expect that bob can join the room because of the cached entitlement
        const error = await getError<Error>(async function () {
            rejoinedRoom = await bobWithNft.joinRoom(channel, spaceId)
        })

        console.log("!!!! bobWithNft's done trying to join !!!", {
            error,
            spaceId,
            channelId: channel.streamId,
            receipt,
            rejoinedRoom,
        })
        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)
        // verify bob can join the room with cached entitlement
        expect(rejoinedRoom).toBeDefined()

        let carolJoinedRoom: Room | undefined

        // carol tries to join the room, and can't as the NFT is no longer accepted
        const carolError = await getError<Error>(async function () {
            carolJoinedRoom = await carolWithNft.joinRoom(channel, spaceId)
        })
        expect(carolJoinedRoom).toBeUndefined()

        // verify error was thrown.
        expect(carolError).not.toBeInstanceOf(NoThrownError)
        // check if error has property name
        if (carolError.name == 'ConnectError') {
            // Casablanca
            expect(carolError.message).toContain('permission_denied')
        }
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
                channel.streamId,
                bobWithNft.walletAddress,
                Permission.Read,
            ),
        ).toBe(false)
    })

    test.skip('delete user-gated role with a channel using it', async () => {
        /** Arrange */
        const { alice, bob, carol } = await registerAndStartClients(['alice', 'bob', 'carol'])
        if (!bob.walletAddress || !carol.walletAddress) {
            throw new Error('bob.walletAddress or carol is undefined')
        }
        const newRoleName = 'newRole1'
        const newPermissions = [Permission.Read, Permission.Write]
        const newTokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        // add bob to the users list
        const newUsers: string[] = [bob.walletAddress, carol.walletAddress]
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.streamId
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
        const channel = await alice.createChannel(
            {
                name: 'test_channel',
                parentSpaceId: roomId,
                roleIds: [roleId],
            },
            alice.provider.wallet,
        )
        if (!channel) {
            throw new Error('channel is undefined')
        }
        // sanity check: bob joins the space successfully
        await waitForWithRetries(() => bob.joinRoom(channel, spaceId))
        // bob leaves the room so that we can delete the role, and test
        // that bob can continue to join room with cached entitlement
        await bob.leave(channel, spaceId)

        await waitFor(() => expect(bob.getRoomData(channel)?.membership).not.toBe('join'))

        /** Act */
        let receipt: ContractReceipt | undefined
        let rejoinedRoom: Room | undefined
        try {
            // delete the role
            const transaction = await alice.spaceDapp.deleteRole(
                spaceId,
                roleIdentifier.roleId,
                alice.provider.wallet,
            )
            receipt = await transaction.wait()
        } catch (e) {
            // unexpected error. fail the test.
            const error = await alice.spaceDapp.parseSpaceError(spaceId, e)
            console.error(error)
            throw error
        }
        // bob tries to join the room again
        // expect that bob cannot join the room
        const error = await getError<Error>(async function () {
            rejoinedRoom = await bob.joinRoom(channel, spaceId)
        })

        console.log("!!!! bob's done trying to join !!!", {
            error,
            spaceId,
            channelId: channel.streamId,
            receipt,
            rejoinedRoom,
        })
        /** Assert */
        // verify transaction was successful
        expect(receipt?.status).toEqual(1)

        let carolJoinedRoom: Room | undefined
        // bob tries to join the room again
        // expect that bob cannot join the room
        const carolError = await getError<Error>(async function () {
            carolJoinedRoom = await carol.joinRoom(channel, spaceId)
        })

        // verfy bob cannot join the room
        expect(carolJoinedRoom).toBeUndefined()
        // verify error was thrown.
        expect(carolError).not.toBeInstanceOf(NoThrownError)
        if (carolError.name == 'ConnectError') {
            // Casablanca
            expect(carolError.message).toContain('permission_denied')
        }
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
                channel.streamId,
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
        const newTokens: TokenEntitlementDataTypes.ExternalTokenStruct[] = []
        // add bob to the users list
        const newUsers: string[] = [bob.walletAddress]
        // create a new test space
        await alice.fundWallet()
        const roomId = await createTestSpaceGatedByTownAndZionNfts(alice, [
            Permission.Read,
            Permission.Write,
        ])
        if (!roomId) {
            throw new Error('roomId is undefined')
        }
        const spaceId = roomId.streamId
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
            const transaction = await alice.spaceDapp.deleteRole(
                spaceId,
                roleIdentifier.roleId,
                alice.provider.wallet,
            )
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
