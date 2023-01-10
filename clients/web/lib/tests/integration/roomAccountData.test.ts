/**
 * sendAMessage
 *
 */

/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithEveryoneRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { FullyReadMarker } from '../../src/types/timeline-types'
import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { ZionAccountDataType } from '../../src/client/ZionClientTypes'
import { waitFor } from '@testing-library/dom'

describe('roomAccountData', () => {
    // test:
    test('create room, send a message, post account data, log out, log in, validate account data', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithEveryoneRole(bob, [
            Permission.Read,
            Permission.Write,
        ])) as RoomIdentifier
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a wenmoon message
        await alice.sendMessage(roomId, 'GM Bob')
        // bob should receive the message
        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)
                    ?.getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === 'GM Bob'),
            ).toBeDefined(),
        )

        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        const event = bob
            .getRoom(roomId)
            ?.getLiveTimeline()
            .getEvents()
            .find((event: MatrixEvent) => event.getContent().body === 'GM Bob')!

        const fullyRead: Record<string, FullyReadMarker> = {
            [roomId.networkId]: {
                channelId: roomId,
                threadParentId: undefined,
                eventId: event.getId(),
                eventOriginServerTs: event.getTs(),
                isUnread: false,
                markedReadAtTs: Date.now(),
                markedUnreadAtTs: 0,
                mentions: 0,
            },
        }

        await bob.setRoomFullyReadData(roomId, fullyRead)
        await bob.stopClients()

        // save some data
        const bob2 = await registerLoginAndStartClient('bob', bob.provider.wallet)
        // bob should have the account data
        const room = bob2.getRoom(roomId)
        expect(room).toBeDefined()
        // get the account data
        const accountData = room!.getAccountData(ZionAccountDataType.FullyRead)
        expect(accountData).toBeDefined()
        // check out the content
        const content = accountData!.getContent()
        expect(content).toEqual(fullyRead)
    }) // end test
}) // end describe
