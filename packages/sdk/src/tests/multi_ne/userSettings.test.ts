/**
 * @group main
 */

import { makeTestClient, waitFor } from '../testUtils'
import { Client } from '../../client'
import { check } from '@towns-protocol/dlog'
import { RiverTimelineEvent, TimelineEvent } from '../../views/models/timelineTypes'

describe('userSettingsTests', () => {
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

    test('clientCanBlockUser', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        expect(stream.view.getMembers().joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )

        // bob blocks alice
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        check(bobsClient.userSettingsStreamId !== undefined)
        await expect(
            bobsClient.waitForStream(bobsClient.userSettingsStreamId),
        ).resolves.not.toThrow()
        await waitFor(() => {
            expect(
                bobsClient.stream(bobsClient.userSettingsStreamId!)?.view?.userSettingsContent
                    ?.userBlocks[alicesClient.userId]?.blocks.length,
            ).toBe(1)
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(true)
        })

        // bob unblocks alice, there will be two blocks
        await bobsClient.updateUserBlock(alicesClient.userId, false)
        await waitFor(() => {
            expect(
                bobsClient.stream(bobsClient.userSettingsStreamId!)?.view?.userSettingsContent
                    ?.userBlocks[alicesClient.userId]?.blocks.length,
            ).toBe(2)
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(false)
        })

        // bob blocks alice again, there will be three blocks
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        await waitFor(() => {
            expect(
                bobsClient.stream(bobsClient.userSettingsStreamId!)?.view?.userSettingsContent
                    ?.userBlocks[alicesClient.userId]?.blocks.length,
            ).toBe(3)
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(true)
        })
    })

    test('DMMessagesAreBlockedDuringBlockedPeriod', async () => {
        const bobsClient = await makeInitAndStartClient()
        const alicesClient = await makeInitAndStartClient()
        const { streamId } = await bobsClient.createDMChannel(alicesClient.userId)
        const stream = await bobsClient.waitForStream(streamId)
        expect(stream.view.getMembers().joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )

        // bob blocks alice
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        check(bobsClient.userSettingsStreamId !== undefined)
        await expect(
            bobsClient.waitForStream(bobsClient.userSettingsStreamId),
        ).resolves.not.toThrow()
        await waitFor(() => {
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(true)
        })

        // alice sends three messages during being blocked, total blocked message should be 3
        await expect(alicesClient.waitForStream(streamId)).resolves.not.toThrow()
        await expect(alicesClient.sendMessage(streamId, 'hello 1st')).resolves.not.toThrow()
        await expect(alicesClient.sendMessage(streamId, 'hello 2nd')).resolves.not.toThrow()
        await expect(alicesClient.sendMessage(streamId, 'hello 3rd')).resolves.not.toThrow()

        // sleeps are lame, but we want to give the message time to be synced
        await new Promise((resolve) => setTimeout(resolve, 230))

        // verify in bob's client, there are 3 blocked messages from alice
        await waitFor(() => {
            const timeline = bobsClient.stream(streamId)?.view?.timeline
            expect(
                timeline?.filter((m) => {
                    return m.sender.id === alicesClient.userId && isChannelMessage(m)
                }).length,
            ).toBe(0)
        })

        // bob unblocks alice
        await bobsClient.updateUserBlock(alicesClient.userId, false)
        // alice sends one more message after being unblocked, total blocked message should still be 3
        await expect(alicesClient.sendMessage(streamId, 'hello 4th')).resolves.not.toThrow()

        await waitFor(() => {
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(false)
        })

        // bob blocks alice again
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        // alice sends two messages after being blocked again, total blocked message should be 5
        await expect(alicesClient.sendMessage(streamId, 'hello 5th')).resolves.not.toThrow()
        await expect(alicesClient.sendMessage(streamId, 'hello 6th')).resolves.not.toThrow()

        // sleeps are lame, but we want to give the message time to be synced
        await new Promise((resolve) => setTimeout(resolve, 230))

        await waitFor(() => {
            expect(
                bobsClient.stream(streamId)?.view?.timeline?.filter((m) => {
                    return m.sender.id === alicesClient.userId && isChannelMessage(m)
                }).length,
            ).toBe(1)
        })
    })
})

function isChannelMessage(m: TimelineEvent): boolean {
    return (
        m.content?.kind === RiverTimelineEvent.ChannelMessage ||
        m.content?.kind === RiverTimelineEvent.ChannelMessageEncrypted ||
        m.content?.kind === RiverTimelineEvent.ChannelMessageEncryptedWithRef
    )
}
