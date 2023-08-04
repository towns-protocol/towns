import { dlog } from './dlog'
import { makeDonePromise, makeTestClient } from './util.test'
import { Client } from './client'
import { RiverEvent } from './event'
import { PayloadCaseType, ToDeviceOp } from '@towns/proto'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import { make_ToDevice_KeyRequest } from './types'

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
            log(`event: ${JSON.stringify(event)}`)
            done.runAndDone(() => {
                // event is unencrypted so clear shouldn't be set
                const content = event.getClearChannelMessage_Post_Text()
                expect(content === undefined).toBeTrue()
                const wire = event.getWireContentChannel()
                expect(wire).toBeDefined()
                expect(wire.content.ciphertext).toContain('Hello, world!')
                // this should be undefined until we attempt decrypting the event
                expect(event.getClearContent()).toBeUndefined()
            })
        }

        const onStreamInitialized = (streamId: string, streamKind: PayloadCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.run(() => {
                if (streamKind === 'channelPayload') {
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

        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId, { name: "Bob's Space" })).toResolve()

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

    test('riverEventCreatedFromToDeviceMessage', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        const aliceUserStreamId = alicesClient.userStreamId
        log('aliceUserStreamId', aliceUserStreamId)
        const aliceUserId = alicesClient.userId
        await alicesClient.startSync()

        const aliceSelfToDevice = makeDonePromise()
        alicesClient.once('toDeviceMessage', (streamId: string, payload: RiverEvent): void => {
            const { content } = payload.getWireContentToDevice()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, payload)
            aliceSelfToDevice.runAndDone(() => {
                expect(payload).toBeDefined()
                log(`payload: ${JSON.stringify(payload)}`)
                expect(content.ciphertext).toBeDefined()
                // this should be undefined until we attempt decrypting the event
                expect(payload?.getClearContent()).toBeUndefined()
            })
        })
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                make_ToDevice_KeyRequest({
                    spaceId: '123412',
                    channelId: '23423',
                    algorithm: 'OLM',
                    senderKey: '123412',
                    sessionId: '123412',
                    content: 'Hi Alice',
                }),
                ToDeviceOp.TDO_UNSPECIFIED,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()

        log('done with river event')
    })
})
