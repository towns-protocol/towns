/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import { MessageType, RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'

describe('messageTypes', () => {
    jest.setTimeout(30000)
    test('send a m.wenmoon message to test message types', async () => {
        // create clients
        const { bob, alice } = await registerAndStartClients(['bob', 'alice'])
        // bob creates a public room
        const roomId = await bob.createSpace({
            name: "bob's room",
            visibility: RoomVisibility.Public,
        })
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a wenmoon message
        await alice.sendMessage(roomId, 'Wen Moon?', {
            messageType: MessageType.WenMoon,
        })
        // bob should receive the message
        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)
                    ?.getLiveTimeline()
                    .getEvents()
                    .find(
                        (event: MatrixEvent) => event.getContent().msgtype === MessageType.WenMoon,
                    ),
            ).toBeDefined(),
        )
    }) // end test
}) // end describe
