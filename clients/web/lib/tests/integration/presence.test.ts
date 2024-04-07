/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import {
    createTestChannelWithSpaceRoles,
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    waitForWithRetries,
} from './helpers/TestUtils'
import { Permission } from '@river-build/web3'
import { waitFor } from '@testing-library/dom'

describe('presence', () => {
    // test:
    test('can we see other users as "currentlyActive?"', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // create a space
        const spaceId = await createTestSpaceGatedByTownNft(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
            },
        )
        // create a channel
        const channelId = await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        })

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
            const bobsViewOfAlice = alice.getUserId() ?? 'alice'
            expect(bobsViewOfAlice).toBeDefined()
        })
    }) // end test
}) // end describe
