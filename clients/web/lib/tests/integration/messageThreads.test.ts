/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier } from '../../src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageThreads', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
    test('send a threaded message', async () => {
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
        )) as RoomIdentifier
        // alice joins the room
        await alice.joinRoom(roomId)
        // alice sends a wenmoon message
        await alice.sendMessage(roomId, 'hi Bob!')
        // bob should receive the message
        await waitFor(() =>
            expect(
                bob
                    .getRoom(roomId)
                    ?.timeline.find(
                        (event: MatrixEvent) => event.event.content?.body === 'hi Bob!',
                    ),
            ).toBeDefined(),
        )

        // get the message id
        const messageId = bob
            .getRoom(roomId)!
            .timeline.find((event: MatrixEvent) => event.event.content?.body === 'hi Bob!')!.event
            .event_id
        // bob sends a threaded message
        await bob.sendMessage(roomId, 'hi Alice!', { threadId: messageId })
        // alice should receive the message
        await waitFor(() =>
            expect(
                alice
                    .getRoom(roomId)
                    ?.timeline.find(
                        (event: MatrixEvent) =>
                            event.event.content &&
                            event.event.content['m.relates_to']?.event_id === messageId,
                    ),
            ).toBeDefined(),
        )
    }) // end test - send a threaded message
}) // end describe
