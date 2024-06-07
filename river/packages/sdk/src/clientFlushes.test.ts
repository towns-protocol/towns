/**
 * @group node-minipool-flush
 */

import { SnapshotCaseType } from '@river-build/proto'
import { Client } from './client'
import { check, DLogger, dlog } from '@river-build/dlog'
import { makeUniqueChannelStreamId } from './id'
import { makeDonePromise, makeTestClient, makeUniqueSpaceStreamId, sendFlush } from './util.test'
import { DecryptedTimelineEvent } from './types'

const log_base = dlog('csb:test')

describe('clientFlushes', () => {
    let bobsClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
    })

    // TODO: https://linear.app/hnt-labs/issue/HNT-2720/re-enable-flush-tests
    test.skip('bobTalksToHimself-flush', async () => {
        const log = log_base.extend('bobTalksToHimself-flush')

        const channelNewMessage = makeDonePromise()
        const streamInitialized = makeDonePromise()

        const onChannelNewMessage = (
            channelId: string,
            streamKind: SnapshotCaseType,
            event: DecryptedTimelineEvent,
        ): void => {
            log('onChannelNewMessage', channelId)
            try {
                const clearEvent = event.decryptedContent
                check(clearEvent.kind === 'channelMessage')
                expect(clearEvent.content.payload).toBeDefined()
                if (
                    clearEvent.content.payload?.case === 'post' &&
                    clearEvent.content.payload?.value?.content?.case === 'text'
                ) {
                    expect(clearEvent.content.payload?.value?.content.value?.body).toContain(
                        'Hello, world!',
                    )
                    //This done should be inside of the if statement to be sure that check happened.
                    channelNewMessage.done()
                }
            } catch (e) {
                log('onChannelNewMessage error', e)
                channelNewMessage.reject(e)
            }
        }

        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            void (async () => {
                try {
                    if (streamKind === 'channelContent') {
                        const channel = bobsClient.stream(streamId)!
                        log('channel content')
                        log(channel.view)

                        channel.on('eventDecrypted', onChannelNewMessage)
                        await bobsClient.sendMessage(streamId, 'Hello, world!')
                        await sendFlush(bobsClient.rpcClient)
                    }
                    streamInitialized.done()
                } catch (e) {
                    log('streamInitialized error', e)
                    streamInitialized.reject(e)
                }
            })()
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.initializeUser()).toResolve()

        await sendFlush(bobsClient.rpcClient)

        bobsClient.startSync()

        await sendFlush(bobsClient.rpcClient)

        const bobsSpaceId = makeUniqueSpaceStreamId()
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await expect(
            bobsClient.createChannel(
                bobsSpaceId,
                bobsChannelName,
                bobsChannelTopic,
                makeUniqueChannelStreamId(bobsSpaceId),
            ),
        ).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await channelNewMessage.expectToSucceed()
        await streamInitialized.expectToSucceed()

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect(log)).toResolve()

        log('pass2 done')
    })

    const bobCanReconnect = async (log: DLogger) => {
        const bobsAnotherClient = await makeTestClient({ context: bobsClient.signerContext })

        const channelNewMessage = makeDonePromise()
        const streamInitialized = makeDonePromise()

        const onChannelNewMessage = (
            channelId: string,
            streamKind: SnapshotCaseType,
            event: DecryptedTimelineEvent,
        ): void => {
            log('onChannelNewMessage', channelId)
            try {
                const clearEvent = event.decryptedContent
                check(clearEvent.kind === 'channelMessage')
                expect(clearEvent.content.payload).toBeDefined()
                if (
                    clearEvent.content.payload?.case === 'post' &&
                    clearEvent.content.payload?.value?.content?.case === 'text'
                ) {
                    expect(clearEvent.content.payload?.value?.content.value?.body).toContain(
                        'Hello, again!',
                    )
                    //This done should be inside of the if statement to be sure that check happened.
                    channelNewMessage.done()
                }
            } catch (e) {
                log('onChannelNewMessage error', e)
                channelNewMessage.reject(e)
            }
        }

        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            void (async () => {
                try {
                    if (streamKind === 'channelContent') {
                        const channel = bobsAnotherClient.stream(streamId)!
                        log('channel content')
                        log(channel.view)

                        const messages = channel.view.timeline.filter(
                            (x) => x.decryptedContent?.kind === 'channelMessage',
                        )
                        expect(messages).toHaveLength(1)

                        channel.on('eventDecrypted', onChannelNewMessage)
                        await bobsAnotherClient.sendMessage(streamId, 'Hello, again!')
                        await sendFlush(bobsClient.rpcClient)
                        //This done should be inside of the if statement to be sure that check happened.
                        streamInitialized.done()
                    }
                } catch (e) {
                    log('streamInitialized error', e)
                    streamInitialized.reject(e)
                }
            })()
        }

        bobsAnotherClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsAnotherClient.initializeUser()).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await sendFlush(bobsClient.rpcClient)

        bobsAnotherClient.startSync()

        await sendFlush(bobsClient.rpcClient)

        await channelNewMessage.expectToSucceed()
        await streamInitialized.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }
})
