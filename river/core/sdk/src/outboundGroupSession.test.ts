/**
 * @group main
 */

import { makeTestClient, makeUniqueSpaceStreamId } from './util.test'
import { Client } from './client'

import { genShortId, makeUniqueChannelStreamId } from './id'
import { ChannelMessage } from '@river-build/proto'

describe('outboundSessionTests', () => {
    let bobsDeviceId: string
    let bobsClient: Client
    beforeEach(async () => {
        bobsDeviceId = genShortId()
        bobsClient = await makeTestClient({ deviceId: bobsDeviceId })
    })

    afterEach(async () => {
        await bobsClient.stop()
    })

    // This test is a bit of a false positive, since it's not actually using the IndexedDB
    // store, but instead the local-storage store.
    test('sameOutboundSessionIsUsedBetweenClientSessions', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, 'Channel', 'Topic', channelId)).toResolve()
        await expect(bobsClient.waitForStream(channelId)).toResolve()

        const message = new ChannelMessage({
            payload: {
                case: 'post',
                value: {
                    content: {
                        case: 'text',
                        value: { body: 'hello' },
                    },
                },
            },
        })

        const bobsOtherClient = await makeTestClient({
            context: bobsClient.signerContext,
            deviceId: bobsDeviceId,
        })
        await expect(bobsOtherClient.initializeUser()).toResolve()
        bobsOtherClient.startSync()

        const encrypted1 = await bobsClient.encryptGroupEvent(message, channelId)
        const encrypted2 = await bobsOtherClient.encryptGroupEvent(message, channelId)

        expect(encrypted1?.sessionId).toBeDefined()
        expect(encrypted1.sessionId).toEqual(encrypted2.sessionId)

        await bobsOtherClient.stop()
        await bobsClient.stop()
    })

    test('differentOutboundSessionIdsForDifferentStreams', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const spaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(spaceId)).toResolve()

        const channelId1 = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, '', '', channelId1)).toResolve()
        await expect(bobsClient.waitForStream(channelId1)).toResolve()

        const channelId2 = makeUniqueChannelStreamId(spaceId)
        await expect(bobsClient.createChannel(spaceId, '', '', channelId2)).toResolve()
        await expect(bobsClient.waitForStream(channelId2)).toResolve()

        const message = new ChannelMessage({
            payload: {
                case: 'post',
                value: {
                    content: {
                        case: 'text',
                        value: { body: 'hello' },
                    },
                },
            },
        })

        const encryptedChannel1_1 = await bobsClient.encryptGroupEvent(message, channelId1)
        const encryptedChannel1_2 = await bobsClient.encryptGroupEvent(message, channelId1)
        const encryptedChannel2_1 = await bobsClient.encryptGroupEvent(message, channelId2)

        expect(encryptedChannel1_1?.sessionId).toBeDefined()
        expect(encryptedChannel1_2?.sessionId).toBeDefined()
        expect(encryptedChannel1_1.sessionId).toEqual(encryptedChannel1_2.sessionId)
        expect(encryptedChannel1_1.sessionId).not.toEqual(encryptedChannel2_1.sessionId)

        const x = bobsClient.cryptoBackend?.encryptionDevice.hasInboundSessionKeys(
            channelId1,
            encryptedChannel1_1.sessionId,
        )
        expect(x).toBeDefined()
    })
})
