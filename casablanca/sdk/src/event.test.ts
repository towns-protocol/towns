import { dlog } from './dlog'
import { makeDonePromise, makeTestClient } from './util.test'
import { Client } from './client'
import { RiverEvent } from './event'
import { PayloadCaseType, ToDeviceOp } from '@towns/proto'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'

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
            /*
            const payload = getMessagePayload(message) as ChannelPayload_Message
            const content = make_ChannelPayload_Message(payload)
            const event = new RiverEvent({
                payload: { parsed_event: content, creator_user_id: bobsClient.userId },
            })
            */
            log(`event: ${JSON.stringify(event)}`)
            done.runAndDone(() => {
                // this should ultimately be ciphertext not plaintext when we turn on encryption
                const content = event.getChannelMessageBody()
                expect(content).toContain('Hello, world!')
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
            const content = payload.getPlainContent()
            const senderKey = content['sender_key']
            const deviceKey = content['device_key']
            log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, payload)
            aliceSelfToDevice.runAndDone(() => {
                expect(payload).toBeDefined()
                log(`payload: ${JSON.stringify(payload)}`)
                expect(payload.getContent().ciphertext).toBeDefined()
                // this should be undefined until we attempt decrypting the event
                expect(payload?.getClearContent()).toBeUndefined()
            })
        })
        // bob sends a message to Alice's device.
        await expect(
            bobsClient.sendToDeviceMessage(
                aliceUserId,
                {
                    content: 'Hi Alice!',
                },
                ToDeviceOp.TDO_UNSPECIFIED,
            ),
        ).toResolve()
        await aliceSelfToDevice.expectToSucceed()

        log('done with river event')
    })
})
