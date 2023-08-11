/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    getPrimaryProtocol,
    registerAndStartClient,
    registerAndStartClients,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'
import { TestConstants } from './helpers/TestConstants'
import { ZionTestClientProps } from './helpers/ZionTestClient'
import { waitFor } from '@testing-library/react'

describe('disable channel', () => {
    const withTestProps: ZionTestClientProps = {
        smartContractVersion: '', // use v3 for the new TownArchitect. work-in-progress.
    }

    test('Space owner is allowed to disable space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'], withTestProps)
        await alice.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const success: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId as string,
            true,
            alice.provider.wallet,
        )

        const spaceInfo = await alice.getSpaceInfoBySpaceId(spaceNetworkId as string)

        /** Assert */
        expect(success).toEqual(true)
        expect(spaceInfo?.disabled).toEqual(true)
        expect(spaceInfo?.networkId).toEqual(spaceNetworkId)
    })

    test('Space owner is allowed to re-enable disabled space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'], withTestProps)
        await alice.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId should be defined')
        }
        const spaceNetworkId = roomId.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const disabled: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId,
            true,
            alice.provider.wallet,
        )
        // set space access on, re-enabling space in ZionSpaceManager
        const enabled: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId,
            false,
            alice.provider.wallet,
        )
        const spaceInfo = await alice.getSpaceInfoBySpaceId(spaceNetworkId)

        /** Assert */
        expect(disabled).toEqual(true)
        expect(enabled).toEqual(true)
        expect(spaceInfo?.disabled).toEqual(false)
        expect(spaceInfo?.networkId).toEqual(spaceNetworkId)
    })

    test('Space member is not allowed to disable space access', async () => {
        /** Arrange */

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'], withTestProps)
        await alice.fundWallet()
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const error = await getError<Error>(async function () {
            await bob.setSpaceAccess(spaceNetworkId as string, true, bob.provider.wallet)
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(error).toHaveProperty('name')
        const regEx = new RegExp(`${CONTRACT_ERROR.NotAllowed}|${CONTRACT_ERROR.NotOwner}`)
        expect(error.name).toMatch(regEx)
    })

    test('Channel member cant sync disabled room messages', async () => {
        if (getPrimaryProtocol() === SpaceProtocol.Casablanca) {
            // Casablanca always allows users to sync messages from disabled rooms
            console.log('Skipping test for Casablanca')
            return
        }
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithMemberNft(),
            withTestProps,
        )
        const { bob } = await registerAndStartClients(['bob'], withTestProps)
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])
        if (roomId === undefined) {
            throw new Error('roomId should be defined')
        }
        if (tokenGrantedUser.getUserId() === undefined) {
            throw new Error('alice.getUserId() should be defined')
        }

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, tokenGrantedUser.getUserId()!)
        await tokenGrantedUser.joinRoom(roomId)

        /** Act */

        // set space access off, disabling space in ZionSpaceManager
        await bob.setSpaceAccess(roomId.networkId, true, bob.provider.wallet)

        /** Assert */

        // scrollback, which calls message sync under the hood, should reject upon performing a
        // leave since the space is disabled
        await waitFor(
            () =>
                expect(tokenGrantedUser.scrollback(roomId, 30)).rejects.toThrow(
                    'You cannot remain in a disabled server',
                ),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
        // give dendrite time to federate leave event
        // can't rejoin the room after it's disabled without a re-invite
        await waitFor(
            () => expect(tokenGrantedUser.joinRoom(roomId)).rejects.toThrow('Unauthorised'),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    })

    test('Channel member needs to rejoin server that was re-enabled', async () => {
        if (getPrimaryProtocol() === SpaceProtocol.Casablanca) {
            // Casablanca ignores enabling/disabling room
            console.log('Skipping test for Casablanca')
            return
        }
        /** Arrange */

        // create all the users for the test
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'], withTestProps)
        await bob.fundWallet()
        const roomId = await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )
        if (roomId === undefined) {
            throw new Error('roomId should be defined')
        }
        if (alice.getUserId() === undefined) {
            throw new Error('alice.getUserId() should be defined')
        }

        /** Act */

        await bob.inviteUser(roomId, alice.getUserId()!)
        await alice.joinRoom(roomId)

        // set space access off, disabling space in ZionSpaceManager
        await bob.setSpaceAccess(roomId.networkId, true, bob.provider.wallet)

        await waitFor(
            () =>
                expect(alice.scrollback(roomId, 30)).rejects.toThrow(
                    'You cannot remain in a disabled server',
                ),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // space is re-enabled. Should be able to join.

        // re-enable space
        await bob.setSpaceAccess(roomId.networkId, false, bob.provider.wallet)

        /** Assert */
        await bob.inviteUser(roomId, alice.getUserId()!)
        await waitFor(
            () => expect(alice.joinRoom(roomId)).resolves.toBeDefined(),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    })
})
