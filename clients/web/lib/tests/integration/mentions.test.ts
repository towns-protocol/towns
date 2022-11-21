/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import { RoomVisibility } from '../../src/types/matrix-types'
import { registerAndStartClients } from './helpers/TestUtils'

describe('mentions', () => {
    jest.setTimeout(30000)
    test('send and receive a mention', async () => {
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
        await alice.sendMessage(roomId, 'Hi @bob', {
            mentions: [
                {
                    userId: bob.getUserId()!,
                    displayName: bob.getUser(bob.getUserId()!)?.displayName ?? 'bob',
                },
            ],
        })
        // bob should receive the message
        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)
                    ?.getLiveTimeline()
                    .getEvents()
                    .find(
                        (event: MatrixEvent) =>
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                            event.getContent()?.body === 'Hi @bob',
                    ),
            ).toBeDefined(),
        )

        const event = bob
            .getRoom(roomId)
            ?.getLiveTimeline()
            .getEvents()
            .find((event: MatrixEvent) => event.getContent()?.body === 'Hi @bob')

        expect(event?.getContent()?.['mentions']).toBeDefined()
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        expect(event?.getContent()?.['mentions']?.[0].userId).toEqual(bob.getUserId()!)
    }) // end test
}) // end describe
