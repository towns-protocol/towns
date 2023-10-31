import { Client } from './client'
import { RiverEventV2 } from './eventV2'
import { RiverEvent } from './event'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import {
    make_ChannelMessage_Post_Content_Text,
    make_ChannelMessage_Post_Content_Image,
    make_ChannelMessage_Post_Content_GM,
    make_ChannelMessage_Reaction,
    make_ChannelMessage_Edit,
    make_ChannelMessage_Redaction,
    isCiphertext,
} from './types'
import { makeDonePromise, makeTestClient } from './util.test'
import { dlog } from './dlog'
import { ChannelMessage, ChannelMessage_Post } from '@river/proto'
import { toPlainMessage } from '@bufbuild/protobuf'

const log = dlog('csb:test')

describe('clientCryptoTest_RiverEventV2', () => {
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

    test('clientCanEncryptDecrypt_Redaction', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payload = {
            refEventId: 'fake_event_id',
            reason: 'good reason',
        }

        const encryptedData = await alicesClient.encryptGroupEvent({
            content: make_ChannelMessage_Redaction(payload.refEventId, payload.reason),
            recipient: { streamId: bobsChannelId },
        })
        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        //const messagePayload = make_ChannelPayload_Message(encryptedData)

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()
        if (clearContent?.content?.payload.case === 'redaction') {
            expect(clearContent?.content?.payload.value?.refEventId).toEqual('fake_event_id')
        }
    })

    test('clientCanEncryptDecrypt_Edit', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payload = {
            body: 'First secret encrypted message by Alice!',
            mentions: [],
        }
        const post = new ChannelMessage_Post({
            content: {
                case: 'text',
                value: payload,
            },
        })
        const encryptedData = await alicesClient.encryptGroupEvent({
            content: make_ChannelMessage_Edit('fake_event_id', toPlainMessage(post)),
            recipient: { streamId: bobsChannelId },
        })
        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        //const messagePayload = make_ChannelPayload_Message(encryptedData)

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()

        if (
            clearContent?.content?.payload.case === 'edit' &&
            clearContent?.content?.payload.value?.post?.content?.case === 'text'
        ) {
            expect(clearContent?.content?.payload.value?.refEventId).toEqual('fake_event_id')
            expect(clearContent?.content?.payload.value?.post?.content?.value.body).toEqual(
                'First secret encrypted message by Alice!',
            )
        }
    })

    test('clientCanEncryptDecrypt_Reaction', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payload = {
            refEventId: 'fake_event_id',
            reaction: '👍',
        }

        const encryptedData = await alicesClient.encryptGroupEvent({
            content: make_ChannelMessage_Reaction(payload.refEventId, payload.reaction),
            recipient: { streamId: bobsChannelId },
        })

        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()

        if (clearContent?.content?.payload.case === 'reaction') {
            expect(clearContent?.content.payload.value.refEventId).toEqual('fake_event_id')
            expect(clearContent?.content.payload.value.reaction).toEqual('👍')
        }
    })

    test('clientCanEncryptDecrypt_PostContentGM_Event', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payload = {
            typeUrl: 'http://fake_url',
        }
        const encryptedData = await alicesClient.encryptGroupEvent({
            content: make_ChannelMessage_Post_Content_GM(payload.typeUrl),
            recipient: { streamId: bobsChannelId },
        })
        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        //const messagePayload = make_ChannelPayload_Message(encryptedData)

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })

        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()
        if (
            clearContent?.content?.payload.case === 'post' &&
            clearContent?.content?.payload.value?.content?.case === 'gm'
        ) {
            expect(clearContent?.content.payload.value.content.value.typeUrl).toEqual(
                'http://fake_url',
            )
        }
    })

    test('clientCanEncryptDecrypt_PostContentImage_Event', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payload = {
            title: 'image1',
            info: { url: 'http://fake_url', mimetype: 'image/png' },
        }

        const encryptedData = await alicesClient.encryptGroupEvent({
            content: make_ChannelMessage_Post_Content_Image(payload.title, payload.info),
            recipient: { streamId: bobsChannelId },
        })
        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        //const messagePayload = make_ChannelPayload_Message(encryptedData)

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()
        if (
            clearContent?.content?.payload.case === 'post' &&
            clearContent?.content?.payload.value?.content?.case === 'image'
        ) {
            expect(clearContent?.content?.payload.value?.content?.value?.title).toEqual('image1')
            expect(clearContent?.content?.payload.value?.content?.value?.info?.url).toEqual(
                'http://fake_url',
            )
        }
    })

    test('clientCanEncryptDecrypt_PostContentText_Event', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payload = {
            content: 'First secret encrypted message!',
        }

        const encryptedData = await alicesClient.encryptGroupEvent({
            content: make_ChannelMessage_Post_Content_Text(payload.content),
            recipient: { streamId: bobsChannelId },
        })
        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()
        if (
            clearContent?.content?.payload.case === 'post' &&
            clearContent?.content?.payload.value?.content?.case === 'text'
        ) {
            expect(clearContent?.content?.payload.value?.content.value?.body).toContain(
                'First secret encrypted message!',
            )
        }
    })

    test('clientCanEncryptDecryptMessageEvents', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const payloads = [
            { content: 'First secret encrypted message by Alice!' },
            { content: 'Second secret encrypted message by Bob!' },
            { content: 'First secret encrypted message by Alice!' },
            { content: 'Second secret encrypted message by Bob!' },
        ]
        const contents: ChannelMessage[] = []
        for (const payload of payloads) {
            contents.push(make_ChannelMessage_Post_Content_Text(payload.content))
        }
        const aliceSenderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!aliceSenderKey) {
            throw new Error('Sender key not found')
        }

        const bobSenderKey = bobsClient.olmDevice.deviceCurve25519Key
        if (!bobSenderKey) {
            throw new Error('Sender key not found')
        }
        const encryptedEvents: RiverEventV2[] = []
        const numEvents = contents.length
        // encrypt events for bobs channel
        let i = 0
        let event_id = 'bob_event_id'
        let client = bobsClient
        for (const content of contents) {
            if (i % 2 === 0) {
                client = alicesClient
                event_id = 'alice_event_id'
            }
            expect(content).toBeDefined()
            const encryptedData = await client.encryptGroupEvent({
                content: content,
                recipient: { streamId: bobsChannelId },
            })
            expect(encryptedData).toBeDefined()

            encryptedEvents.push(
                new RiverEventV2({
                    channel_id: bobsChannelId,
                    event_id: event_id,
                    stream_id: bobsChannelId,
                    content: encryptedData,
                }),
            )
            i++
        }

        // alternate decrypting events between alice and bob's client
        // alice should decrypt events encrypted by bob and vice versa
        let j = 0
        for (const encryptedEvent of encryptedEvents) {
            if (j === numEvents) {
                break
            }
            const client =
                encryptedEvent.encryptedEvent.event_id == 'bob_event_id' ? alicesClient : bobsClient
            expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
            expect(encryptedEvent.getWireContent()).toBeDefined()
            const content = encryptedEvent.getContent()
            // note: at times jest toBeUnDefined() fails to detect undefined here
            expect(content === undefined).toBe(true)
            await expect(client.decryptEventIfNeeded(encryptedEvent)).toResolve()
            const clearContent = encryptedEvent.getContent()
            expect(clearContent).toBeDefined()
            if (
                clearContent?.content?.payload.case === 'post' &&
                clearContent?.content?.payload.value?.content?.case === 'text'
            ) {
                expect(clearContent?.content?.payload.value?.content.value?.body).toContain(
                    'secret encrypted message',
                )
            }
            j++
        }
    })

    test('clientCannotDecryptRoomMessageEventWithoutSession', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        const payload = {
            content: 'First secret encrypted message!',
        }

        const encryptedData = await bobsClient.encryptGroupEvent({
            content: make_ChannelMessage_Post_Content_Text(payload.content),
            recipient: { streamId: bobsChannelId },
        })
        expect(encryptedData).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }

        const event = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        expect(event.shouldAttemptDecryption()).toBe(true)
        expect(event.getWireContent()).toBeDefined()
        const content = event.getContent()
        expect(content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(event)).toResolve()
        const clearContent = event.getContent()
        expect(clearContent).toBeDefined()
        // note: we need to delete session from crypto store since session store is shared
        // in node test environment.
        alicesClient.cryptoStore?.deleteInboundGroupSessions(
            event.encryptedEvent.content.senderKey ?? '',
            event.encryptedEvent.content.sessionId ?? '',
        )
        const eventForAlice = new RiverEventV2({
            channel_id: bobsChannelId,
            event_id: 'fake_event_id',
            stream_id: bobsChannelId,
            content: encryptedData,
        })
        await expect(alicesClient.decryptEventIfNeeded(eventForAlice)).toResolve()
        const clear = eventForAlice.getContent()
        if (clear && clear.error) {
            expect(clear.error.type).toEqual('m.bad.encrypted')
        }
    })

    // todo: run the following tests once RiverEventV2 replaces RiverEvent in client emitters.
    test.skip('encryptDecryptChannelMessageSentOverClient', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        log(`bobUserId', ${bobsClient.userId}`)
        log(`aliceUserId', ${alicesClient.userId}`)

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const bobSelfToDevice = makeDonePromise()
        bobsClient.on('channelNewMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentChannel()
            const senderKey = content['sender_key']
            const sessionId = content['session_id']
            log('channelNewMessage for Alice', streamId, senderKey, sessionId, content)
            if (streamId == bobsChannelId) {
                bobSelfToDevice.runAndDoneAsync(async () => {
                    expect(content).toBeDefined()
                    await bobsClient.decryptEventIfNeeded(event)
                    const clearEvent = event.getClearContent_ChannelMessage()
                    expect(clearEvent?.payload).toBeDefined()
                    if (
                        clearEvent?.payload?.case === 'post' &&
                        clearEvent?.payload?.value?.content?.case === 'text'
                    ) {
                        expect(clearEvent?.payload?.value?.content.value?.body).toContain(
                            'First secret encrypted message!',
                        )
                    }
                })
            }
        })

        // Alices sends message to Bob's channel
        const payload = 'First secret encrypted message!'
        await expect(
            alicesClient.sendChannelMessage(
                bobsChannelId,
                make_ChannelMessage_Post_Content_Text(payload),
            ),
        ).toResolve()

        // Bob listens for message from Alice and attempts to decrypt it
        await bobSelfToDevice.expectToSucceed()
    })

    test.skip('encryptedChannelMessageReturnsCiphertext', async () => {
        await expect(bobsClient.createNewUser()).toResolve()
        await expect(bobsClient.initCrypto()).toResolve()
        await bobsClient.startSync()
        await expect(alicesClient.createNewUser()).toResolve()
        await expect(alicesClient.initCrypto()).toResolve()
        expect(
            alicesClient.olmDevice.deviceCurve25519Key !== bobsClient.olmDevice.deviceCurve25519Key,
        ).toBe(true)
        await alicesClient.startSync()

        // bob creates space, channel and invites alice
        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        log(`bobUserId', ${bobsClient.userId}`)
        log(`aliceUserId', ${alicesClient.userId}`)

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // alice joins space and channel
        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            log('userInvitedToStream', 'Alice', streamId)
            aliceJoined.runAndDoneAsync(async () => {
                expect(streamId).toBe(bobsChannelId)
                await expect(alicesClient.joinStream(streamId)).toResolve()
            })
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const bobSelfToDevice = makeDonePromise()
        bobsClient.on('channelNewMessage', (streamId: string, event: RiverEvent): void => {
            const { content } = event.getWireContentChannel()
            const senderKey = content['sender_key']
            const sessionId = content['session_id']
            log('channelNewMessage', streamId, senderKey, sessionId, content)
            if (streamId == bobsChannelId) {
                bobSelfToDevice.runAndDoneAsync(async () => {
                    expect(content).toBeDefined()
                    await bobsClient.decryptEventIfNeeded(event)
                    const wireEvent = event.getWireContentChannel().content.ciphertext
                    expect(wireEvent).toBeDefined()
                    expect(isCiphertext(wireEvent ?? '')).toBe(true)
                })
            }
        })

        // Alices sends message to Bob's channel
        const payload = 'First secret encrypted message!'
        await expect(
            alicesClient.sendChannelMessage(
                bobsChannelId,
                make_ChannelMessage_Post_Content_Text(payload),
            ),
        ).toResolve()

        // Bob listens for message from Alice and attempts to decrypt it
        await bobSelfToDevice.expectToSucceed()
    })

    test('encryptMultipleMessagesAcrossManyChannel', async () => {})
})
