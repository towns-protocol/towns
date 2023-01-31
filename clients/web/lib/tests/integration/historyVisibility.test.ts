/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/react'
import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ContractTypes'
import { RoomVisibility } from '../../src/types/matrix-types'
import { sleep } from '../../src/utils/zion-utils'
import {
    createTestSpaceWithEveryoneRole,
    makeUniqueName,
    registerAndStartClients,
} from './helpers/TestUtils'

describe('historyVisibility', () => {
    test('create public room, send message, join second user, read message', async () => {
        // create bob
        const { bob, john } = await registerAndStartClients(['bob', 'john'])
        //
        await bob.fundWallet()
        // bob creates a room
        const roomId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: makeUniqueName('bobsroom'),
                visibility: RoomVisibility.Public,
            },
        ))!

        await john.joinRoom(roomId)

        await john.sendMessage(roomId, "I'm John!")

        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)!
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === "I'm John!"),
            ).toBeDefined(),
        )

        await john.logout()

        await bob.sendMessage(roomId, 'Hello World!')
        // create alice (important to do in this order, we had a bug were alice
        // would not be able to see messages if she registered after bob sent a message)
        const { alice } = await registerAndStartClients(['alice'])
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice should eventually see the room
        await waitFor(() => expect(alice.getRoom(roomId)).toBeDefined())
        // get the room
        const room = alice.getRoom(roomId)!

        await sleep(1)

        console.log(
            'room.getLiveTimeline().getEvents()',
            room
                .getLiveTimeline()
                .getEvents()
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                .map((event: MatrixEvent) => `${event.getType()} ${event.getContent().body}`),
        )

        const events = room
            .getLiveTimeline()
            .getEvents()
            .filter((event: MatrixEvent) => event.getType() === 'm.room.encrypted')

        for (const event of events) {
            await alice.matrixClient!.decryptEventIfNeeded(event, {
                isRetry: true,
                emit: true,
                forceRedecryptIfUntrusted: true,
            })
        }

        console.log(
            'room.getLiveTimeline().getEvents() after decrypting',
            room
                .getLiveTimeline()
                .getEvents()
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                .map((event: MatrixEvent) => `${event.getType()} ${event.getContent().body}`),
        )

        // and we should see the message
        await waitFor(() =>
            expect(
                room
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === 'Hello World!'),
            ).toBeDefined(),
        )

        await waitFor(() =>
            expect(
                room
                    .getLiveTimeline()
                    .getEvents()
                    .find((event: MatrixEvent) => event.getContent().body === "I'm John!"),
            ).toBeDefined(),
        )
    })
})
