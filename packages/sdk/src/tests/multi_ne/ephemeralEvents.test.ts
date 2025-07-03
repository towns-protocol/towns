/**
 * @group main
 */

import { createEventDecryptedPromise, makeTestClient, waitFor } from '../testUtils'
import { Client } from '../../client'
import { make_MemberPayload_KeyFulfillment, make_MemberPayload_KeySolicitation } from '../../types'
import { hexToBytes } from 'ethereum-cryptography/utils'
import { MembershipOp } from '@towns-protocol/proto'

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

    test('should allow ephemeral key fulfillments', async () => {
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

    test('should handle ephemeral key exchange', async () => {
        const alice = await makeInitAndStartClient()
        const bob = await makeInitAndStartClient()
        const charlie = await makeInitAndStartClient()
        const chuck = await makeInitAndStartClient()
        const { streamId } = await alice.createGDMChannel([bob.userId, charlie.userId])

        await waitFor(() => {
            return alice.streams.get(streamId)?.view.membershipContent.joined.size === 3
        })

        await alice.sendMessage(streamId, 'hello')
        await alice.inviteUser(streamId, chuck.userId)

        const stream = await chuck.waitForStream(streamId)
        await stream.waitForMembership(MembershipOp.SO_INVITE)
        const chuckEventDecryptedPromise = createEventDecryptedPromise(chuck, 'hello')
        await expect(chuck.joinStream(streamId)).resolves.not.toThrow()
        await expect(chuckEventDecryptedPromise).resolves.not.toThrow()
    })
})
