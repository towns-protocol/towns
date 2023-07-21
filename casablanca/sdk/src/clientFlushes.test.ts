/**
 * @group node-minipool-flush
 */

import { PayloadCaseType } from '@towns/proto'
import { Client } from './client'
import { DLogger, dlog } from './dlog'
import { RiverEvent } from './event'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import { makeDonePromise, makeTestClient, sendFlush } from './util.test'
import { getMessagePayloadContent_Text } from './types'

const log_base = dlog('csb:test')

describe('clientFlushes', () => {
    let bobsClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
    })

    test('bobTalksToHimself-flush', async () => {
        const log = log_base.extend('bobTalksToHimself-flush')

        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, message: RiverEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            done.runAndDone(() => {
                const content = message.getChannelMessageBody()
                expect(content).toBe('Hello, world!')
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: PayloadCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.runAsync(async () => {
                if (streamKind === 'channelPayload') {
                    const channel = bobsClient.stream(streamId)!
                    log('channel content')
                    log(channel.view)

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                    await sendFlush(bobsClient.rpcClient)
                }
            })
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.createNewUser()).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await bobsClient.startSync()

        await sendFlush(bobsClient.rpcClient)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId, { name: "Bob's Space" })).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await expect(
            bobsClient.createChannel(
                bobsSpaceId,
                bobsChannelName,
                bobsChannelTopic,
                makeChannelStreamId('bobs-channel-' + genId()),
            ),
        ).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await done.expectToSucceed()

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect(log)).toResolve()

        log('pass2 done')
    })

    const bobCanReconnect = async (log: DLogger) => {
        const bobsAnotherClient = await makeTestClient(undefined, bobsClient.signerContext)

        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, message: RiverEvent): void => {
            log('channelNewMessage', channelId)
            log(message)
            done.runAndDone(() => {
                const content = message.getChannelMessageBody()
                expect(content).toBe('Hello, again!')
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: PayloadCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.runAsync(async () => {
                if (streamKind === 'channelPayload') {
                    const channel = bobsAnotherClient.stream(streamId)!
                    log('channel content')
                    log(channel.view)

                    const messages = Array.from(channel.view.messages.values())
                    expect(messages).toHaveLength(1)
                    expect(getMessagePayloadContent_Text(messages[0])?.body).toBe('Hello, world!')

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsAnotherClient.sendMessage(streamId, 'Hello, again!')
                    await sendFlush(bobsClient.rpcClient)
                }
            })
        }
        bobsAnotherClient.on('streamInitialized', onStreamInitialized)

        await sendFlush(bobsClient.rpcClient)

        await expect(bobsAnotherClient.loadExistingUser()).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await bobsAnotherClient.startSync()

        await sendFlush(bobsClient.rpcClient)

        await done.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }
})
