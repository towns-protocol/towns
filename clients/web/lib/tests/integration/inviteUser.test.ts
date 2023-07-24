/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 * @group casablanca
 */
import {
    createTestSpaceWithEveryoneRole,
    getPrimaryProtocol,
    registerAndStartClients,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ContractTypes'
import { waitFor } from '@testing-library/dom'
import { RoomVisibility } from '../../src/types/zion-types'
import { SpaceProtocol } from '../../src/client/ZionClientTypes'

describe('inviteUser', () => {
    // test:
    test('create room, invite user, accept invite', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a room
        const roomId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!
        // bob invites alice to the room
        await bob.inviteUser(roomId, alice.getUserId()!)
        await waitFor(() => expect(bob.getRoomData(roomId)?.members.length == 1))
        if (getPrimaryProtocol() === SpaceProtocol.Matrix) {
            // alice should expect an invite to the room
            await waitFor(() => expect(alice.getRoomData(roomId)).toBeDefined())
        }
        // alice joins the room
        await alice.joinRoom(roomId)
        await waitFor(() => expect(bob.getRoomData(roomId)?.members.length == 2))
    }) // end test
}) // end describe
