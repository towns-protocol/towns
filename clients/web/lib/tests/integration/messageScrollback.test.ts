/* eslint-disable @typescript-eslint/no-non-null-assertion */

import {
    createTestSpaceWithZionMemberRole,
    registerAndStartClients,
    registerLoginAndStartClient,
} from './helpers/TestUtils'

import { Permission } from '../../src/client/web3/ZionContractTypes'
import { RoomIdentifier } from '../../src/types/matrix-types'
import { TestConstants } from './helpers/TestConstants'
import { waitFor } from '@testing-library/dom'

describe('messageScrollback', () => {
    jest.setTimeout(TestConstants.DefaultJestTimeout)
    test('make sure we can scrollback', async () => {
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
        // send 25 messages (20 is our default initialSyncLimit)
        for (let i = 0; i < 25; i++) {
            await bob.sendMessage(roomId, `message ${i}`)
        }
        // alice joins the room
        await alice.joinRoom(roomId)
        //
        // alice should receive 20 messages message
        //
        await waitFor(
            () => expect(alice.getRoom(roomId)?.getLiveTimeline().getEvents().length).toBe(20),
            TestConstants.DefaultWaitForTimeout,
        )
        // call scrollback
        await alice.scrollback(roomId, 30)
        // did we get more events?
        await waitFor(
            () =>
                expect(alice.getRoom(roomId)?.getLiveTimeline().getEvents().length).toBeGreaterThan(
                    20,
                ),
            TestConstants.DefaultWaitForTimeout,
        )
    }) // end test - send a threaded message
}) // end describe
