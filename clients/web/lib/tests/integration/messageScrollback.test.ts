/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '@river/web3'
import { RoomIdentifier } from '../../src/types/room-identifier'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageScrollback', () => {
    test('make sure we can scrollback', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient('alice', TestConstants.getWalletWithMemberNft())
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const roomId = (await createTestSpaceWithZionMemberRole(
            bob,
            [Permission.Read, Permission.Write],
            [],
        )) as RoomIdentifier
        // send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(roomId, `message ${i}`)
        }
        // alice joins the room
        await alice.joinRoom(roomId)
        //
        // alice should receive 20 messages message
        //
        await waitFor(() => expect(alice.getEvents(roomId).length).toBe(20))
        // call scrollback
        await alice.scrollback(roomId, 30)
        // did we get more events?
        await waitFor(() => expect(alice.getEvents(roomId).length).toBeGreaterThan(20))
    }) // end test - send a threaded message
}) // end describe
