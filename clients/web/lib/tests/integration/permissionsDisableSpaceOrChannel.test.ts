/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { CONTRACT_ERROR, NoThrownError, getError } from './helpers/ErrorUtils'
import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoomVisibility } from 'use-zion-client/src/types/zion-types'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/react'

describe('disable channel', () => {
    test('Space owner is allowed to disable space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const success: boolean | undefined = await alice.setSpaceAccess(
            spaceNetworkId as string,
            true,
        )

        const spaceInfo = await alice.getSpaceInfoBySpaceId(spaceNetworkId as string)

        /** Assert */
        expect(success).toEqual(true)
        expect(spaceInfo?.disabled).toEqual(true)
        expect(spaceInfo?.networkId).toEqual(spaceNetworkId)
    })

    test('Space owner is allowed to re-enable disabled space access', async () => {
        /** Arrange */

        const { alice } = await registerAndStartClients(['alice'])
        await alice.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        if (!roomId) {
            throw new Error('roomId should be defined')
        }
        const spaceNetworkId = roomId.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const disabled: boolean | undefined = await alice.setSpaceAccess(spaceNetworkId, true)
        // set space access on, re-enabling space in ZionSpaceManager
        const enabled: boolean | undefined = await alice.setSpaceAccess(spaceNetworkId, false)
        const spaceInfo = await alice.getSpaceInfoBySpaceId(spaceNetworkId)

        /** Assert */
        expect(disabled).toEqual(true)
        expect(enabled).toEqual(true)
        expect(spaceInfo?.disabled).toEqual(false)
        expect(spaceInfo?.networkId).toEqual(spaceNetworkId)
    })

    test('Space member is not allowed to disable space access', async () => {
        /** Arrange */

        const { alice, bob } = await registerAndStartClients(['alice', 'bob'])
        await alice.fundWallet()
        await bob.fundWallet()

        const roomId = await createTestSpaceWithZionMemberRole(alice, [Permission.Read])
        const spaceNetworkId: string | undefined = roomId?.networkId
        /** Act */
        // set space access off, disabling space in ZionSpaceManager
        const error = await getError<Error>(async function () {
            await bob.setSpaceAccess(spaceNetworkId as string, true)
        })

        /* Assert */
        // check that the returned error wasn't that no error was thrown.
        expect(error).not.toBeInstanceOf(NoThrownError)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(error).toHaveProperty('name', CONTRACT_ERROR.NotAllowed)
    })

    test('Channel member cant sync disabled room messages', async () => {
        /** Arrange */

        // create all the users for the test
        const tokenGrantedUser = await registerLoginAndStartClient(
            'tokenGrantedUser',
            TestConstants.getWalletWithNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        await bob.fundWallet()

        // create a space with token entitlement to write
        const roomId = await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])
        if (roomId === undefined) {
            throw new Error('roomId should be defined')
        }
        if (tokenGrantedUser.matrixUserId === undefined) {
            throw new Error('alice.matrixUserId should be defined')
        }

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId)
        await tokenGrantedUser.joinRoom(roomId)

        /** Act */

        // set space access off, disabling space in ZionSpaceManager
        await bob.setSpaceAccess(roomId.networkId, true)

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
        /** Arrange */

        // create all the users for the test
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
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
        if (alice.matrixUserId === undefined) {
            throw new Error('alice.matrixUserId should be defined')
        }

        /** Act */

        await bob.inviteUser(roomId, alice.matrixUserId)
        await alice.joinRoom(roomId)

        // set space access off, disabling space in ZionSpaceManager
        await bob.setSpaceAccess(roomId.networkId, true)

        await waitFor(
            () =>
                expect(alice.scrollback(roomId, 30)).rejects.toThrow(
                    'You cannot remain in a disabled server',
                ),
            TestConstants.DoubleDefaultWaitForTimeout,
        )

        // space is re-enabled. Should be able to join.

        // re-enable space
        await bob.setSpaceAccess(roomId.networkId, false)

        /** Assert */
        await bob.inviteUser(roomId, alice.matrixUserId)
        await waitFor(
            () => expect(alice.joinRoom(roomId)).resolves.toBeDefined(),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    })
})
