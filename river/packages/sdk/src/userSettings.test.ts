/**
 * @group main
 */

import { makeTestClient, waitFor } from './util.test'
import { Client } from './client'
import { check } from '@river-build/dlog'

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
        expect(stream.view.getMembers().membership.joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )

        // bob blocks alice
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        check(bobsClient.userSettingsStreamId !== undefined)
        await expect(bobsClient.waitForStream(bobsClient.userSettingsStreamId)).toResolve()
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
        expect(stream.view.getMembers().membership.joinedUsers).toEqual(
            new Set([bobsClient.userId, alicesClient.userId]),
        )

        // bob blocks alice
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        check(bobsClient.userSettingsStreamId !== undefined)
        await expect(bobsClient.waitForStream(bobsClient.userSettingsStreamId)).toResolve()
        await waitFor(() => {
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(true)
        })

        // alice sends three messages during being blocked, total blocked message should be 3
        await expect(alicesClient.waitForStream(streamId)).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello 1st')).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello 2nd')).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello 3rd')).toResolve()

        // bob unblocks alice, there will be two blocks
        await bobsClient.updateUserBlock(alicesClient.userId, false)
        // alice sends one more message after being unblocked, total blocked message should still be 3
        await expect(alicesClient.sendMessage(streamId, 'hello 4th')).toResolve()

        await waitFor(() => {
            expect(
                bobsClient
                    .stream(bobsClient.userSettingsStreamId!)
                    ?.view?.userSettingsContent?.isUserBlocked(alicesClient.userId),
            ).toBe(false)
        })

        // verify in bob's client, there are 3 blocked messages from alice
        await waitFor(() => {
            expect(
                bobsClient.stream(streamId)?.view?.timeline?.filter((m) => {
                    return (
                        m.creatorUserId === alicesClient.userId &&
                        bobsClient
                            .stream(bobsClient.userSettingsStreamId!)
                            ?.view?.userSettingsContent?.isUserBlockedAt(
                                alicesClient.userId,
                                m.eventNum,
                            )
                    )
                }).length,
            ).toBe(3)
        })

        // bob blocks alice again
        await bobsClient.updateUserBlock(alicesClient.userId, true)
        // alice sends two messages after being blocked again, total blocked message should be 5
        await expect(alicesClient.sendMessage(streamId, 'hello 5th')).toResolve()
        await expect(alicesClient.sendMessage(streamId, 'hello 6th')).toResolve()

        await waitFor(() => {
            expect(
                bobsClient.stream(streamId)?.view?.timeline?.filter((m) => {
                    return (
                        m.creatorUserId === alicesClient.userId &&
                        bobsClient
                            .stream(bobsClient.userSettingsStreamId!)
                            ?.view?.userSettingsContent?.isUserBlockedAt(
                                alicesClient.userId,
                                m.eventNum,
                            )
                    )
                }).length,
            ).toBe(5)
        })
    })
})
