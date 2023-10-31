import { dlog } from './dlog'
import { makeDonePromise, makeTestClient } from './util.test'
import { Client } from './client'
import { RiverEvent } from './event'
import { SnapshotCaseType } from '@river/proto'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import { isCiphertext } from './types'

const log = dlog('test')

describe('riverEventTest', () => {
    let bobsClient: Client
    let alicesClient: Client

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('riverEventCreatedFromChannelMessage', async () => {
        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, event: RiverEvent): void => {
            log('channelNewMessage', channelId)
            done.runAndDone(() => {
                // event is unencrypted so clear shouldn't be set
                const content = event.getClearContent_ChannelMessage()
                expect(content?.payload === undefined).toBeTrue()
                const wire = event.getWireContentChannel()
                expect(wire).toBeDefined()
                if (wire?.content?.ciphertext) {
                    expect(isCiphertext(wire?.content?.ciphertext)).toBeTrue()
                }
                // this should be undefined until we attempt decrypting the event
                expect(event.getClearContent()).toBeUndefined()
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.run(() => {
                if (streamKind === 'channelContent') {
                    const channel = bobsClient.stream(streamId)!
                    log('channel content')
                    log(channel.view)

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                }
            })
        }

        bobsClient.on('streamInitialized', onStreamInitialized)
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()

        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        await expect(
            bobsClient.createChannel(
                bobsSpaceId,
                bobsChannelName,
                bobsChannelTopic,
                makeChannelStreamId('bobs-channel-' + genId()),
            ),
        ).toResolve()

        await done.expectToSucceed()

        await bobsClient.stopSync()

        log('done with river event')
    })
})
