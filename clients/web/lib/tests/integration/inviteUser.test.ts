/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group core
 */
import { createTestSpaceGatedByTownNft, registerAndStartClients } from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { waitFor } from '@testing-library/dom'

describe('inviteUser', () => {
    // test:
    test('create room, invite user, accept invite', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a room
        const roomId = (await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        ))!
        // bob invites alice to the room
        await bob.inviteUser(roomId, alice.getUserId()!)
        await waitFor(() => expect(bob.getRoomData(roomId)?.members.length == 1))
        // alice joins the room
        await waitFor(() => expect(bob.getRoomData(roomId)?.members.length == 2))
    }) // end test
}) // end describe
