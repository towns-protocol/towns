/**
 * @group main
 */

import { makeTestClient, waitFor } from '../testUtils'
import { Client } from '../../client'
import { make_MemberPayload_KeyFulfillment, make_MemberPayload_KeySolicitation } from '../../types'
import { hexToBytes } from 'ethereum-cryptography/utils'

// Scaffold for ephemeral events tests

describe('ephemeralEvents', () => {
    let clients: Client[] = []

    const makeInitAndStartClient = async () => {
        const client = await makeTestClient()
        await client.initializeUser()
        client.startSync()
        clients.push(client)
        return client
    }

    beforeEach(async () => {})

    afterEach(async () => {
        for (const client of clients) {
            await client.stop()
        }
        clients = []
    })

    test('should handle ephemeral event (scaffold)', async () => {
        const alice = await makeInitAndStartClient()
        const bob = await makeInitAndStartClient()
        const { streamId } = await alice.createDMChannel(bob.userId)

        const deviceKey = alice.userDeviceKey()
        const event = make_MemberPayload_KeySolicitation({
            deviceKey: deviceKey.deviceKey,
            fallbackKey: deviceKey.fallbackKey,
            isNewDevice: false,
            sessionIds: ['abc'],
        })

        await alice.makeEventAndAddToStream(streamId, event, {
            ephemeral: true,
        })

        const stream = await alice.waitForStream(streamId)

        await waitFor(() => {
            return stream.view.ephemeralEvents.size == 1
        })

        // before actually fulfilling the key solicitation, this event tells everyone that is listening, that bob fulfilled alice's key solicitation
        const fulfillmentEvent = make_MemberPayload_KeyFulfillment({
            userAddress: hexToBytes(bob.userId),
            deviceKey: deviceKey.deviceKey,
            sessionIds: ['abc'],
        })

        /*
            out of scope for this test, Bob sends Alice the keys on a private channel <- 
        */

        await expect(
            bob.makeEventAndAddToStream(streamId, fulfillmentEvent, {
                ephemeral: false,
            }),
        ).rejects.toThrow('solicitation with matching device key not found')

        await bob.makeEventAndAddToStream(streamId, fulfillmentEvent, {
            ephemeral: true,
        })
    })
})
