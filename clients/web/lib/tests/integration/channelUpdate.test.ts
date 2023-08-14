/**
 * @group dendrite
 */
import { MAXTRIX_ERROR, MatrixError, NoThrownError, getError } from './helpers/ErrorUtils'
import { Room, RoomVisibility } from '../../src/types/zion-types'
import {
    createTestSpaceWithZionMemberRole,
    findRoleByName,
    registerAndStartClients,
    waitForRandom401ErrorsForAction,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { ContractReceipt } from 'ethers'
import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { ZionTestClientProps } from './helpers/ZionTestClient'

// TODO: skip for now, refactor to accommodate new contracts
// https://linear.app/hnt-labs/issue/HNT-1641/testsintegrationchannelupdatetestts
describe.skip('channel update', () => {
    const withTestProps: ZionTestClientProps = {
        smartContractVersion: '', // use v3 for the new TownArchitect. work-in-progress.
    }

    test('Update the channel with multicall', async () => {
        /** Arrange */
        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], withTestProps)
        const channelName = 'my best friends channel'
        const roleName = 'my best friends'
        const permissions = [Permission.Read, Permission.Write]
        // create a token-gated space
        await alice.fundWallet()
        const spaceId = await createTestSpaceWithZionMemberRole(alice, permissions)
        if (!spaceId) {
            throw new Error('spaceId is undefined')
        }
        // get current role details
        const roleDetails = await findRoleByName(alice, spaceId.networkId, 'Member')
        if (!roleDetails) {
            throw new Error('roleDetails is undefined')
        }
        // create a channel with the space role
        const channelId = await alice.createChannel(
            {
                name: channelName,
                visibility: RoomVisibility.Public,
                parentSpaceId: spaceId,
                roleIds: [roleDetails.id],
            },
            alice.provider.wallet,
        )
        if (!channelId) {
            throw new Error('channelId is undefined')
        }

        /** Act */
        // bob tries to join the space and fails because he doesn't have the token
        const bobJoinError = await getError<MatrixError>(async function () {
            await bob.joinRoom(channelId, spaceId.networkId)
        })
        // alice creates a new role with bob as a member
        if (!bob.walletAddress) {
            throw new Error('bob.walletAddress is undefined')
        }
        const newRoleId = await alice.createRole(
            spaceId.networkId,
            roleName,
            permissions,
            roleDetails.tokens,
            [bob.walletAddress],
        )
        if (!newRoleId) {
            throw new Error('newRoleId is undefined')
        }
        // alice updates the channel with the new role
        let receipt: ContractReceipt | undefined
        try {
            const transaction = await alice.spaceDapp.updateChannel(
                {
                    spaceId: spaceId.networkId,
                    channelId: channelId.networkId,
                    channelName,
                    roleIds: [newRoleId.roleId],
                },
                alice.provider.wallet,
            )
            receipt = await transaction.wait()
        } catch (e) {
            const error = await alice.spaceDapp.parseSpaceError(spaceId.networkId, e)
            console.error(error)
            // fail the test.
            throw e
        }
        // bob tries to join the space and succeeds because he is a member of the new role
        const bobJoinedRoom = await waitForRandom401ErrorsForAction<Room>(() =>
            bob.joinRoom(channelId, spaceId.networkId),
        )

        /** Assert */
        // verify the transaction succeeded
        expect(receipt?.status).toEqual(1)
        // bob wasn't able to join the space initially
        expect(bobJoinError).not.toBeInstanceOf(NoThrownError)
        expect(bobJoinError.data).toHaveProperty('errcode', MAXTRIX_ERROR.M_FORBIDDEN)
        // bob was able to join the space after the channel was updated
        expect(bobJoinedRoom?.id.networkId).toBeTruthy()

        try {
            await alice.logout()
            await bob.logout()
        } catch (error) {
            console.error(error)
        }
    })
})
