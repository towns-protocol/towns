/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { waitFor } from '@testing-library/dom'
import { Membership } from '../../src/types/towns-types'

describe('inviteUser', () => {
    // test:
    test('create room, invite user, accept invite', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        await alice.fundWallet()
        // have alice create a room so she's a valid user
        await createTestSpaceGatedByTownNft(alice, [Permission.Read, Permission.Write])
        // bob creates a room
        const streamId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )
        await waitFor(() => expect(bob.getRoomData(streamId)?.membership).toBe(Membership.Join))
        // bob invites alice to the room
        await bob.inviteUser(streamId, alice.getUserId())
        // alice joins the room
        await waitFor(() => expect(alice.getRoomData(streamId)?.membership).toBe(Membership.Invite))
    }) // end test
}) // end describe
