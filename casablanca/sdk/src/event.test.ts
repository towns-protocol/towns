import { dlog } from './dlog'
import { makeDonePromise, makeTestClient } from './util.test'
import { Client } from './client'
import { RiverEventV2 } from './eventV2'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import { isCiphertext } from './types'

const log = dlog('csb:test')

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

        const onChannelNewMessage = (channelId: string, event: RiverEventV2): void => {
            log('onChannelNewMessage', channelId)
            done.runAndDone(() => {
                // event is unencrypted so clear shouldn't be set
                const content = event.getContent()
                expect(content).toBeUndefined()
                const wire = event.getWireContent()
                expect(wire).toBeDefined()
                if (wire?.text) {
                    expect(isCiphertext(wire?.text)).toBeTrue()
                }
                // this should be undefined until we attempt decrypting the event
                expect(event.getContent()).toBeUndefined()
            })
        }

        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        bobsClient.on('channelNewMessage', onChannelNewMessage)

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()
        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        await expect(alicesClient.initializeUser()).toResolve()
        await alicesClient.startSync()

        await expect(alicesClient.joinStream(bobsSpaceId)).toResolve()
        await expect(alicesClient.joinStream(bobsChannelId)).toResolve()

        await alicesClient.sendMessage(bobsChannelId, 'hello from alice')

        await done.expectToSucceed()
        await bobsClient.stopSync()
        log('done with river event test')
    })
})
