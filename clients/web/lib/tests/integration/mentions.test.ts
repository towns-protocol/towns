/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { waitFor } from '@testing-library/dom'
import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomVisibility } from '../../src/types/matrix-types'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

describe('mentions', () => {
    test('send and receive a mention', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerLoginAndStartClient('alice', TestConstants.getWalletWithNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Public,
            },
        )) as RoomIdentifier
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
