/**
 * @group main
 */

import { makeTestClient, waitFor } from '../testUtils'
import { Client } from '../../client'
import { make_MemberPayload_KeySolicitation } from '../../types'

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
        expect(stream.view.getMembers().joinedUsers).toEqual(new Set([alice.userId, bob.userId]))

        await waitFor(() => {
            return stream.view.ephemeralEvents.size == 1
        })
        console.log(stream.view.ephemeralEvents)
    })
})
