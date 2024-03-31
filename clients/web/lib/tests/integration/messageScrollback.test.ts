/* eslint-disable @typescript-eslint/no-non-null-assertion */
/**
 * @group dendrite
 */
import {
    createTestSpaceGatedByTownsNfts,
    registerAndStartClients,
    registerAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '@river-build/web3'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageScrollback', () => {
    test('make sure we can scrollback', async () => {
        // create clients
        // alice needs to have a valid nft in order to join bob's space / channel
        const alice = await registerAndStartClient(
            'alice',
            TestConstants.getWalletWithTestGatingNft(),
        )
        const { bob } = await registerAndStartClients(['bob'])
        // bob needs funds to create a space
        await bob.fundWallet()
        // bob creates a public room
        const spaceId = (await createTestSpaceGatedByTownsNfts(bob, [
            Permission.Read,
            Permission.Write,
        ])) as string
        // send 25 messages
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(spaceId, `message ${i}`)
        }
        // alice joins the room
        await alice.joinTown(spaceId, alice.wallet)
        //
        // alice should receive 20 messages message
        //
        await waitFor(() => expect(alice.getEvents(spaceId).length).toBe(20))
        // call scrollback
        await alice.scrollback(spaceId)
        // did we get more events?
        await waitFor(() => expect(alice.getEvents(spaceId).length).toBeGreaterThan(20))
    }) // end test - send a threaded message
}) // end describe
