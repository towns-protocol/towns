/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * sendAMessage
 *
 * @group dendrite
 */
import {
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    registerAndStartClient,
    createTestChannelWithSpaceRoles,
    waitForWithRetries,
} from './helpers/TestUtils'

import { FullyReadMarker } from '../../src/types/timeline-types'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { SpaceProtocol, ZionAccountDataType } from '../../src/client/ZionClientTypes'
import { waitFor } from '@testing-library/dom'
import { RoomVisibility } from '../../src/types/zion-types'

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
        const spaceId = (await createTestSpaceWithEveryoneRole(bob, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier

        const channelId = (await createTestChannelWithSpaceRoles(bob, {
            name: 'bobs channel',
            parentSpaceId: spaceId,
            visibility: RoomVisibility.Public,
            roleIds: [],
        }))!

        // alice joins the space
        await alice.joinRoom(spaceId)

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
            [channelId.networkId]: {
                channelId: channelId,
                threadParentId: undefined,
                eventId: event.eventId,
                eventOriginServerTs: event.originServerTs,
                isUnread: false,
                markedReadAtTs: Date.now(),
                markedUnreadAtTs: 0,
                mentions: 0,
            },
        }

        await bob.setRoomFullyReadData(channelId, fullyRead)
        await bob.logout()

        // save some data
        // eslint-disable-next-line @typescript-eslint/require-await
        const bob2 = await registerAndStartClient('bob', (async () => bob.provider.wallet)())

        if (channelId.protocol === SpaceProtocol.Matrix) {
            // bob should have the account data
            const room = bob2.matrixClient?.getRoom(channelId.networkId)
            expect(room).toBeTruthy()
            // get the account data
            const accountData = room!.getAccountData(ZionAccountDataType.FullyRead)
            expect(accountData).toBeTruthy()
            // check out the content
            const content = accountData?.getContent()
            expect(content).toEqual(fullyRead)
        } else {
            expect(false) // TODO https://linear.app/hnt-labs/issue/HNT-634/getroom-for-casablanca
        }
    }) // end test
}) // end describe
