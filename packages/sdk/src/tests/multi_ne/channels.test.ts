/**
 * @group main
 */

import {
    getChannelMessagePayload,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
} from '../testUtils'
import { Client } from '../../client'

import { makeUniqueChannelStreamId } from '../../id'
import { bin_toHexString } from '@towns-protocol/dlog'

describe('channelsTests', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        await bobsClient.initializeUser()
        bobsClient.startSync()

        alicesClient = await makeTestClient()
        await alicesClient.initializeUser()
        alicesClient.startSync()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('clientsCanSendRedactionEvents', async () => {
        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).resolves.not.toThrow()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId),
        ).resolves.not.toThrow()
        await bobsClient.sendMessage(channelId, 'Very bad message!')
        const channelStream = await bobsClient.waitForStream(channelId)
        let eventId: string | undefined
        await waitFor(() => {
            const event = channelStream.view.timeline.find(
                (e) =>
                    getChannelMessagePayload(e.localEvent?.channelMessage) === 'Very bad message!',
            )
            expect(event).toBeDefined()
            eventId = event?.hashStr
        })

        expect(channelStream).toBeDefined()
        expect(eventId).toBeDefined()

        await expect(bobsClient.redactMessage(channelId, eventId!)).resolves.not.toThrow()
        await waitFor(() => {
            const event = channelStream.view.timeline.find(
                (e) =>
                    e.remoteEvent?.event.payload.case === 'channelPayload' &&
                    e.remoteEvent.event.payload.value.content.case === 'redaction' &&
                    bin_toHexString(e.remoteEvent.event.payload.value.content.value.eventId) ===
                        eventId!,
            )
            expect(event).toBeDefined()
        })
    })
})
