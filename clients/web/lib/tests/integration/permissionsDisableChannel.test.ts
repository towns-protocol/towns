/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithEveryoneRole,
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from 'use-zion-client/tests/integration/helpers/TestUtils'

import { Permission } from 'use-zion-client/src/client/web3/ContractTypes'
import { RoomVisibility } from 'use-zion-client/src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/react'

describe('disable channel', () => {
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
        const roomId = (await createTestSpaceWithZionMemberRole(bob, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        // invite user to join the space by first checking if they can read.
        await bob.inviteUser(roomId, tokenGrantedUser.matrixUserId as string)
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
        const roomId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier

        /** Act */

        await bob.inviteUser(roomId, alice.matrixUserId as string)
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
        await bob.inviteUser(roomId, alice.matrixUserId as string)
        await waitFor(
            () => expect(alice.joinRoom(roomId)).resolves.toBeDefined(),
            TestConstants.DoubleDefaultWaitForTimeout,
        )
    })
})
