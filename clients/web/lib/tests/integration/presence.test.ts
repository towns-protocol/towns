/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'
import { Permission } from '@river/web3'
import { RoomVisibility } from '../../src/types/zion-types'
import { waitFor } from '@testing-library/dom'

describe('presence', () => {
    // test:
    test('can we see other users as "currentlyActive?"', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        ))!
        // create a channel
        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        console.log("bob's spaceId", { spaceId, channelId })

        await waitForWithRetries(() => alice.joinRoom(channelId))

        await waitForWithRetries(() => alice.sendMessage(channelId, 'Hi @bob'))

        await waitFor(() =>
            expect(bob.getEvents_TypedRoomMessage(channelId).at(-1)?.content?.body).toEqual(
                'Hi @bob',
            ),
        )
        // expect bob to see alice as online
        await waitFor(() => {
            const bobsViewOfAlice = bob.getUser(alice.getUserId()!)
            expect(bobsViewOfAlice).toBeDefined()
            expect(bobsViewOfAlice?.currentlyActive).toEqual(true)
        })
    }) // end test
}) // end describe
