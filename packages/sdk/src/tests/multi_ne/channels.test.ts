/**
 * @group main
 */

import {
    getTimelineMessagePayload,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
} from '../testUtils'
import { Client } from '../../client'

import { makeUniqueChannelStreamId } from '../../id'
import { RiverTimelineEvent } from '../../views/models/timelineTypes'

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
                (e) => getTimelineMessagePayload(e) === 'Very bad message!',
            )
            expect(event).toBeDefined()
            eventId = event?.eventId
        })

        expect(channelStream).toBeDefined()
        expect(eventId).toBeDefined()

        await expect(bobsClient.redactMessage(channelId, eventId!)).resolves.not.toThrow()
        await waitFor(() => {
            const event = channelStream.view.timeline.find(
                (e) =>
                    e.content?.kind === RiverTimelineEvent.RedactionActionEvent &&
                    e.content.refEventId === eventId!,
            )
            expect(event).toBeDefined()
        })
    })
})
