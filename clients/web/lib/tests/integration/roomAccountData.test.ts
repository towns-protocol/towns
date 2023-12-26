/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * sendAMessage
 *
 * @group dendrite
 */
import {
    createTestSpaceGatedByTownNft,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { waitFor } from '@testing-library/dom'
import { FullyReadMarker } from '@river/proto'

// we store fully read markers in the room account data
// required to show the "new" banner in channels and threads
describe('roomAccountData', () => {
    // test:
    test('create room, send a message, post account data, log out, log in, validate account data', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceGatedByTownNft(bob, [
            Permission.Read,
            Permission.Write,
        ])) as string

        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            roleIds: [],
        }))!

        // alice joins the space
        await alice.joinTown(spaceId, alice.wallet)

        // alice joins the channel
        await waitForWithRetries(() => alice.joinRoom(channelId))

        // alice sends a message
        await alice.sendMessage(channelId, 'GM Bob')
        // bob should receive the message
        await waitFor(() => expect(bob.getMessages(channelId)).toContain('GM Bob'))

        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        const event = bob
            .getEvents_TypedRoomMessage(channelId)
            .find((event) => event.content.body === 'GM Bob')!

        const fullyRead: Record<string, FullyReadMarker> = {
            [channelId]: {
                channelId: channelId,
                threadParentId: undefined,
                eventId: event.eventId,
                eventNum: event.eventNum,
                beginUnreadWindow: event.eventNum - 1n,
                endUnreadWindow: event.eventNum + 1n,
                isUnread: false,
                markedReadAtTs: BigInt(Date.now()),
                mentions: 0,
            } satisfies FullyReadMarker,
        }

        await bob.setRoomFullyReadData(channelId, fullyRead)
        await bob.logout()

        // save some data
        // eslint-disable-next-line @typescript-eslint/require-await
        const bob2 = await registerAndStartClient('bob', (async () => bob.provider.wallet)())
        console.log('bob', bob2)
        expect(false).toBe(true) // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
    }) // end test
}) // end describe
