/**
 * @group main
 */

import { Client } from '../../client'
import { dlog } from '@towns-protocol/dlog'
import { isDefined } from '../../check'
import { TestClientOpts, makeTestClient, makeUniqueSpaceStreamId, waitFor } from '../testUtils'
import { Stream } from '../../stream'
import { DecryptionSessionError } from '../../decryptionExtensions'
import { makeUniqueChannelStreamId } from '../../id'
import { SyncState } from '../../syncedStreamsLoop'
import { RiverTimelineEvent } from '../../views/models/timelineTypes'

const log = dlog('csb:test:decryptionExtensions')

describe('ClientDecryptionExtensions', () => {
    let clients: Client[] = []
    const makeAndStartClient = async (opts?: TestClientOpts) => {
        const client = await makeTestClient(opts)
        await client.initializeUser()
        client.startSync()
        await waitFor(() => expect(client.streams.syncState).toBe(SyncState.Syncing))
        log('started client', client.userId, client.signerContext)
        clients.push(client)
        return client
    }

    const sendMessage = async (client: Client, streamId: string, body: string) => {
        await client.waitForStream(streamId)
        return await client.sendMessage(streamId, body)
    }

    const getDecryptedChannelMessages = (stream: Stream): string[] => {
        return stream.view.timeline
            .map((e) => {
                // for tests, return decrypted content
                if (e.content?.kind === RiverTimelineEvent.ChannelMessage) {
                    return e.content.body
                }
                return undefined
            })
            .filter(isDefined)
    }

    const waitForMessages = async (client: Client, streamId: string, bodys: string[]) => {
        log('waitForMessages', client.userId, streamId, bodys)
        const stream = await client.waitForStream(streamId)
        return waitFor(
            () => {
                const messages = getDecryptedChannelMessages(stream)
                expect(messages).toEqual(bodys)
            },
            { timeoutMS: 15000 },
        )
    }

    const getDecryptionErrors = async (
        client: Client,
        streamId: string,
    ): Promise<DecryptionSessionError[]> => {
        const stream = client.stream(streamId) ?? (await client.waitForStream(streamId))
        return stream.view.timeline
            .map((e) => {
                if (
                    e.content?.kind === RiverTimelineEvent.ChannelMessageEncrypted ||
                    e.content?.kind === RiverTimelineEvent.EncryptedChannelProperties
                ) {
                    return e.content?.error
                }
                return undefined
            })
            .filter(isDefined)
    }

    const waitForDecryptionErrors = async (client: Client, streamId: string, count: number) => {
        log('waitForDecryptionErrors', client.userId, streamId, count)
        return waitFor(
            async () => {
                const errors = await getDecryptionErrors(client, streamId)
                expect(errors.length).toEqual(count)
            },
            { timeoutMS: 10000 },
        )
    }

    beforeEach(async () => {})
    afterEach(async () => {
        for (const client of clients) {
            await client.stop()
        }
        clients = []
    })

    test('shareKeysWithNewDevices', async () => {
        const bob1 = await makeAndStartClient({ deviceId: 'bob1' })
        const alice1 = await makeAndStartClient({ deviceId: 'alice1' })

        // create a dm and send a message
        const { streamId } = await bob1.createDMChannel(alice1.userId)
        await sendMessage(bob1, streamId, 'hello')
        await expect(alice1.waitForStream(streamId)).resolves.not.toThrow()

        // wait for the message to arrive and decrypt
        await expect(waitForMessages(alice1, streamId, ['hello'])).resolves.not.toThrow()

        // boot up alice on a second device
        const alice2 = await makeAndStartClient({
            context: alice1.signerContext,
            deviceId: 'alice2',
        })

        // This wait takes over 5s
        await expect(alice2.waitForStream(streamId)).resolves.not.toThrow()

        // alice gets keys sent via new device message
        await expect(waitForMessages(alice2, streamId, ['hello'])).resolves.not.toThrow()

        // stop alice2 so she's offline
        await alice2.stop()

        // send a second message
        const bob2 = await makeAndStartClient({
            context: bob1.signerContext,
            deviceId: 'bob2',
        })

        await expect(bob2.waitForStream(streamId)).resolves.not.toThrow()

        await sendMessage(bob2, streamId, 'whats up')

        // the message should get decrypted on alice1
        await expect(waitForMessages(bob1, streamId, ['hello', 'whats up'])).resolves.not.toThrow()
        await expect(
            waitForMessages(alice1, streamId, ['hello', 'whats up']),
        ).resolves.not.toThrow()

        // start alice2 back up
        const alice2_restarted = await makeAndStartClient({
            context: alice1.signerContext,
            deviceId: 'alice2',
        })

        await expect(alice2_restarted.waitForStream(streamId)).resolves.not.toThrow()

        // she should have the keys because bob2 should share with existing members
        await expect(
            waitForMessages(alice2_restarted, streamId, ['hello', 'whats up']),
        ).resolves.not.toThrow()
    })

    // users aren't online at the same time
    test('bobIsntOnlineToShareKeys', async () => {
        // have two people come up, go offline, then two more people come up
        const bob1 = await makeAndStartClient({ deviceId: 'bob1' })
        const spaceId = makeUniqueSpaceStreamId()
        await bob1.createSpace(spaceId)
        const channelId = makeUniqueChannelStreamId(spaceId)
        await bob1.createChannel(spaceId, 'bob1sChannel', '', channelId)
        await sendMessage(bob1, channelId, 'its bob')
        await bob1.stop()

        // alice comes up, joins the space and channel, and sends a message
        const alice1 = await makeAndStartClient({ deviceId: 'alice1' })
        await alice1.joinStream(spaceId)
        await alice1.joinStream(channelId)

        // By default, clients will send an ephemeral solicitation first
        // in this case, we want to make sure that the solicitation is sent as non-ephemeral
        // so that bob can see the solicitation and share keys,
        // otherwise we'd need to wait for the ephemeral timeout to expire
        alice1['decryptionExtensions']!.ephemeralTimeoutMs = 100

        await expect(waitForDecryptionErrors(alice1, channelId, 1)).resolves.not.toThrow() // alice should see a decryption error
        await expect(waitForMessages(alice1, channelId, [])).resolves.not.toThrow() // alice doesn't see the message if bob isn't online to send keys
        await sendMessage(alice1, channelId, 'its alice')
        await expect(waitForMessages(alice1, channelId, ['its alice'])).resolves.not.toThrow() // alice doesn't see the message if bob isn't online to send keys

        // bob comes back online, same device
        const bob1IsBack = await makeAndStartClient({
            context: bob1.signerContext,
            deviceId: 'bob1',
        })
        await expect(
            waitForMessages(bob1IsBack, channelId, ['its bob', 'its alice']),
        ).resolves.not.toThrow()

        // alice should get keys and decrypt bobs message
        await expect(
            waitForMessages(alice1, channelId, ['its bob', 'its alice']),
        ).resolves.not.toThrow()
    })

    test('shareKeysInMultipleStreamsToSameDevice', async () => {
        const bob1 = await makeAndStartClient({ deviceId: 'bob1' })
        const alice1 = await makeAndStartClient({ deviceId: 'alice1' })

        const spaceId = makeUniqueSpaceStreamId()
        await bob1.createSpace(spaceId)
        const channel1StreamId = makeUniqueChannelStreamId(spaceId)
        const channel2StreamId = makeUniqueChannelStreamId(spaceId)
        await bob1.createChannel(spaceId, 'channel1', '', channel1StreamId)
        await bob1.createChannel(spaceId, 'channel2', '', channel2StreamId)
        const event1 = await sendMessage(bob1, channel1StreamId, 'hello channel 1')
        log('hello channel 1 eventId', event1.eventId)
        const event2 = await sendMessage(bob1, channel2StreamId, 'hello channel 2')
        log('hello channel 2 eventId', event2.eventId)

        await expect(alice1.joinStream(spaceId)).resolves.not.toThrow()
        await expect(alice1.joinStream(channel1StreamId)).resolves.not.toThrow()
        await expect(alice1.joinStream(channel2StreamId)).resolves.not.toThrow()

        // wait for the message to arrive and decrypt
        await expect(
            waitForMessages(alice1, channel1StreamId, ['hello channel 1']),
            `waiting for ${event1.eventId}`,
        ).resolves.not.toThrow()
        await expect(
            waitForMessages(alice1, channel2StreamId, ['hello channel 2']),
            `waiting for ${event2.eventId}`,
        ).resolves.not.toThrow()

        // stop bob to simplify test
        await bob1.stop()

        // boot up alice on a second device
        const alice2 = await makeAndStartClient({
            context: alice1.signerContext,
            deviceId: 'alice2',
        })

        // This wait takes over 5s, we should address
        await expect(alice2.waitForStream(channel1StreamId)).resolves.not.toThrow()
        await expect(alice2.waitForStream(channel2StreamId)).resolves.not.toThrow()

        // alice gets keys sent via new device message
        await expect(
            waitForMessages(alice2, channel1StreamId, ['hello channel 1']),
        ).resolves.not.toThrow()
        await expect(
            waitForMessages(alice2, channel2StreamId, ['hello channel 2']),
        ).resolves.not.toThrow()
    })
})
