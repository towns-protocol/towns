/**
 * @group node-minipool-flush
 */

import { SnapshotCaseType } from '@river/proto'
import { Client } from './client'
import { check, DLogger, dlog } from '@river/waterproof'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import { makeDonePromise, makeTestClient, sendFlush } from './util.test'
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

        const done = makeDonePromise()

        const onChannelNewMessage = (
            channelId: string,
            streamKind: SnapshotCaseType,
            event: DecryptedTimelineEvent,
        ): void => {
            log('onChannelNewMessage', channelId)
            done.runAndDoneAsync(async () => {
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
                }
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.runAsync(async () => {
                if (streamKind === 'channelContent') {
                    const channel = bobsClient.stream(streamId)!
                    log('channel content')
                    log(channel.view)

                    channel.on('eventDecrypted', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                    await sendFlush(bobsClient.rpcClient)
                }
            })
        }
        bobsClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsClient.initializeUser()).toResolve()

        await sendFlush(bobsClient.rpcClient)

        bobsClient.startSync()

        await sendFlush(bobsClient.rpcClient)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

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
        const bobsAnotherClient = await makeTestClient({ context: bobsClient.signerContext })

        const done = makeDonePromise()

        const onChannelNewMessage = (
            channelId: string,
            streamKind: SnapshotCaseType,
            event: DecryptedTimelineEvent,
        ): void => {
            log('onChannelNewMessage', channelId)
            done.runAndDoneAsync(async () => {
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
                }
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.runAsync(async () => {
                if (streamKind === 'channelContent') {
                    const channel = bobsAnotherClient.stream(streamId)!
                    log('channel content')
                    log(channel.view)

                    const messages = channel.view.timeline.filter(
                        (x) => x.decryptedContent?.kind === 'channelMessage',
                    )
                    expect(messages).toHaveLength(1)

                    channel.on('eventDecrypted', onChannelNewMessage)
                    bobsAnotherClient.sendMessage(streamId, 'Hello, again!')
                    await sendFlush(bobsClient.rpcClient)
                }
            })
        }

        bobsAnotherClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsAnotherClient.initializeUser()).toResolve()

        await sendFlush(bobsClient.rpcClient)

        await sendFlush(bobsClient.rpcClient)

        bobsAnotherClient.startSync()

        await sendFlush(bobsClient.rpcClient)

        await done.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }
})
