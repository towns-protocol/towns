/**
 * sendAMessage
 *
 * // https://www.npmjs.com/package/jest-runner-groups
 * @group integration/load
 *
 */
/* eslint-disable @typescript-eslint/no-non-null-assertion */

import { createTestSpaceWithEveryoneRole, registerAndStartClients } from './helpers/TestUtils'

import { MatrixEvent } from 'matrix-js-sdk'
import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier, RoomVisibility } from '../../src/types/matrix-types'
import { waitFor } from '@testing-library/dom'

describe('sendAMessage', () => {
    // can be run with `yarn test --group integration/load`, setting timeout to 10 minutes
    jest.setTimeout(10 * 60 * 1000)
    // test:
    test('create room, invite user, accept invite, and send message', async () => {
        const numClients = process.env.NUM_CLIENTS ? parseInt(process.env.NUM_CLIENTS, 10) : 2
        expect(numClients).toBeGreaterThanOrEqual(2)
        console.log('sendAMessage', { numClients })
        // create clients
        const names = Array.from(Array(numClients).keys()).map((i) => `client_${i}`)
        const clients = await registerAndStartClients(names)
        const bob = clients['client_0']

        // bob creates a space
        console.log(`!!!!!! bob creates space`)
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a space
        const roomId = (await createTestSpaceWithEveryoneRole(
            bob,
            [Permission.Read, Permission.Write],
            {
                name: bob.makeUniqueName(),
                visibility: RoomVisibility.Private,
            },
        )) as RoomIdentifier

        // bob invites everyone else to the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! bob invites client ${i}`)
            const client = clients[`client_${i}`]
            await bob.inviteUser(roomId, client.matrixUserId!)
            // wait for client to see the invite
            await waitFor(() => expect(client.getRoom(roomId)).toBeDefined())
        }

        // everyone joins the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} joins room`)
            const client = clients[`client_${i}`]
            await client.joinRoom(roomId)
        }

        // bob sends a message to the room
        console.log(`!!!!!! bob sends message`)
        await bob.sendMessage(roomId, 'Hello Alice!')

        // everyone should receive the message
        for (let i = 0; i < numClients; i++) {
            console.log(`!!!!!! client ${i} waits for message`)
            const client = clients[`client_${i}`]
            await waitFor(() =>
                expect(
                    client
                        .getRoom(roomId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .find((event: MatrixEvent) => event.getContent()?.body === 'Hello Alice!'),
                ).toBeDefined(),
            )
        }
        // everyone sends a message to the room
        for (let i = 1; i < numClients; i++) {
            console.log(`!!!!!! client ${i} sends a message`)
            const client = clients[`client_${i}`]
            await client.sendMessage(roomId, `Hello Bob! from ${client.matrixUserId!}`)
            // bob should receive the message
            await waitFor(() =>
                expect(
                    bob
                        .getRoom(roomId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .find(
                            (event: MatrixEvent) =>
                                event.getContent()?.body ===
                                `Hello Bob! from ${client.matrixUserId!}`,
                        ),
                ).toBeDefined(),
            )
        }
    }) // end test
}) // end describe
