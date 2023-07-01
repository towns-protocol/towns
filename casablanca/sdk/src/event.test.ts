import { dlog } from './dlog'
import { makeDonePromise, makeTestClient } from './util.test'
import { Client } from './client'
import { RiverEvent } from './event'
import {
    ParsedEvent,
    getMessagePayload,
    make_ChannelPayload_Message,
    make_UserPayload_ToDevice,
} from './types'
import {
    ChannelPayload_Message,
    PayloadCaseType,
    ToDeviceOp,
    UserPayload_ToDevice,
} from '@towns/proto'
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

        const onChannelNewMessage = (channelId: string, message: ParsedEvent): void => {
            log('channelNewMessage', channelId)
            const payload = getMessagePayload(message) as ChannelPayload_Message
            const content = make_ChannelPayload_Message(payload)
            const event = new RiverEvent({
                payload: { parsed_event: content, creator_user_id: bobsClient.userId },
            })
            log(`event: ${JSON.stringify(event)}`)
            done.runAndDone(() => {
                // this should ultimately be ciphertext not plaintext when we turn on encryption
                expect(event.getContent().ciphertext).toContain('Hello, world!')
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
                    log(channel.rollup)

                    channel.on('channelNewMessage', onChannelNewMessage)
                    bobsClient.sendMessage(streamId, 'Hello, world!')
                }
            })
        }

        bobsClient.on('streamInitialized', onStreamInitialized)
        await expect(bobsClient.createNewUser()).toResolve()

        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        await expect(
            bobsClient.createChannel(bobsSpaceId, makeChannelStreamId('bobs-channel-' + genId())),
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
        alicesClient.once(
            'toDeviceMessage',
            (streamId: string, payload: UserPayload_ToDevice, senderUserId: string): void => {
                const { senderKey, deviceKey } = payload
                log('toDeviceMessage for Alice', streamId, senderKey, deviceKey, payload?.value)
                aliceSelfToDevice.runAndDone(() => {
                    expect(payload).toBeDefined()
                    let event: RiverEvent | undefined
                    if (payload) {
                        const content = make_UserPayload_ToDevice(payload)
                        event = new RiverEvent({
                            payload: { parsed_event: content, creator_user_id: senderUserId },
                        })
                    }
                    log(`event: ${JSON.stringify(event)}`)
                    expect(event?.getContent().ciphertext).toBeDefined()
                    // this should be undefined until we attempt decrypting the event
                    expect(event?.getClearContent()).toBeUndefined()
                })
            },
        )
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
