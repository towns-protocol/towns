import { Client } from './client'
import { MEGOLM_ALGORITHM } from './crypto/olmLib'
import { EncryptedEventStreamTypes, IContent, RiverEvent } from './event'
import { genId, makeChannelStreamId, makeSpaceStreamId } from './id'
import {
    make_ChannelPayload_Message,
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
import { ChannelMessage_Post } from '@river/proto'
import { PlainMessage } from '@bufbuild/protobuf'

const log = dlog('csb:test')

describe('clientCryptoTest', () => {
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

    test('clientCanImportExportMegolmSession', async () => {})

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

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ChannelMessage_Redaction(payload.refEventId, payload.reason),
                algorithm: MEGOLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const encryptedContent = encryptedEvent.getContentChannel()
        expect(encryptedContent?.content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearContent = encryptedEvent.getClearContent_ChannelMessage()
        expect(clearContent?.payload).toBeDefined()
        if (clearContent?.payload?.case === 'redaction') {
            expect(clearContent?.payload?.value?.refEventId).toEqual('fake_event_id')
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

        const post: PlainMessage<ChannelMessage_Post> = {
            content: {
                value: { body: 'First secret encrypted message by Alice!', mentions: [] },
                case: 'text',
            },
        }
        const payload = {
            refEventId: 'fake_event_id',
            post: post,
        }

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ChannelMessage_Edit(payload.refEventId, payload.post),
                algorithm: MEGOLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const encryptedContent = encryptedEvent.getContentChannel()
        expect(encryptedContent?.content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearContent = encryptedEvent.getClearContent_ChannelMessage()
        expect(clearContent?.payload).toBeDefined()
        if (
            clearContent?.payload?.case === 'edit' &&
            clearContent?.payload?.value?.post?.content?.case === 'text'
        ) {
            expect(clearContent?.payload?.value?.refEventId).toEqual('fake_event_id')
            expect(clearContent?.payload?.value?.post?.content?.value.body).toEqual(
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

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ChannelMessage_Reaction(payload.refEventId, payload.reaction),
                algorithm: MEGOLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const encryptedContent = encryptedEvent.getContentChannel()
        expect(encryptedContent?.content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearContent = encryptedEvent.getClearContent_ChannelMessage()
        expect(clearContent?.payload).toBeDefined()
        if (clearContent?.payload?.case === 'reaction') {
            expect(clearContent?.payload.value.refEventId).toEqual('fake_event_id')
            expect(clearContent?.payload.value.reaction).toEqual('👍')
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

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ChannelMessage_Post_Content_GM(payload.typeUrl),
                algorithm: MEGOLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const encryptedContent = encryptedEvent.getContentChannel()
        expect(encryptedContent?.content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearContent = encryptedEvent.getClearContent_ChannelMessage()
        expect(clearContent?.payload).toBeDefined()
        if (
            clearContent?.payload?.case === 'post' &&
            clearContent?.payload?.value?.content?.case === 'gm'
        ) {
            expect(clearContent?.payload.value.content.value.typeUrl).toEqual('http://fake_url')
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

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ChannelMessage_Post_Content_Image(payload.title, payload.info),
                algorithm: MEGOLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const encryptedContent = encryptedEvent.getContentChannel()
        expect(encryptedContent?.content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearContent = encryptedEvent.getClearContent_ChannelMessage()
        expect(clearContent?.payload).toBeDefined()
        if (
            clearContent?.payload?.case === 'post' &&
            clearContent?.payload?.value?.content?.case === 'image'
        ) {
            expect(clearContent?.payload?.value?.content?.value?.title).toEqual('image1')
            expect(clearContent?.payload?.value?.content?.value?.info?.url).toEqual(
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

        const payload = JSON.stringify({
            content: 'First secret encrypted message!',
        })

        // create a message to encrypt
        const content: IContent = {
            content: {
                content: make_ChannelMessage_Post_Content_Text(payload),
                algorithm: MEGOLM_ALGORITHM,
            },
        }

        const event = new RiverEvent({
            content: content,
            sender: alicesClient.userId, // typically creatorUserId is added by event envelope in the server
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        // ensure olm session with bob
        expect(event.event.content).toBeDefined()
        await expect(alicesClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }
        // create a message event from alice's encrypted event and have bob decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: alicesClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const encryptedContent = encryptedEvent.getContentChannel()
        expect(encryptedContent?.content).toBeUndefined()
        await expect(bobsClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clearContent = encryptedEvent.getClearContent_ChannelMessage()
        expect(clearContent?.payload).toBeDefined()
        if (
            clearContent?.payload?.case === 'post' &&
            clearContent?.payload?.value?.content?.case === 'text'
        ) {
            expect(clearContent?.payload?.value?.content.value?.body).toContain(
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
        const contents: IContent[] = []
        for (const payload of payloads) {
            contents.push({
                content: {
                    content: make_ChannelMessage_Post_Content_Text(payload.content),
                    algorithm: MEGOLM_ALGORITHM,
                },
            })
        }
        const aliceSenderKey = alicesClient.olmDevice.deviceCurve25519Key
        if (!aliceSenderKey) {
            throw new Error('Sender key not found')
        }

        const bobSenderKey = bobsClient.olmDevice.deviceCurve25519Key
        if (!bobSenderKey) {
            throw new Error('Sender key not found')
        }
        const events: Array<{
            event: RiverEvent
            client: Client
            senderKey: string
            senderUser: string
        }> = []
        let i = 0
        // let alice and bob alternate encrypting messages to bob's channel
        for (const content of contents) {
            const client = i % 2 == 0 ? alicesClient : bobsClient
            const senderKey = i % 2 == 0 ? aliceSenderKey : bobSenderKey
            const senderUser = i % 2 == 0 ? alicesClient.userId : bobsClient.userId
            log(`Encrypting message ${i} with sender key ${senderKey}, ${senderUser}}`)
            events.push({
                event: new RiverEvent({
                    content: content,
                    sender: senderUser,
                    stream_type: EncryptedEventStreamTypes.Channel,
                }),
                senderKey,
                senderUser,
                client,
            })
            i++
        }
        const encryptedEvents: RiverEvent[] = []
        const numEvents = events.length
        // encrypt events for bobs channel
        for (const event of events) {
            expect(event.event.event.content).toBeDefined()
            await expect(
                event.client.encryptEvent(event.event, { channelId: bobsChannelId }),
            ).toResolve()
            expect(event.event.shouldAttemptDecryption()).toBe(false)
            const ciphertext = event.event.getWireContentChannel().content.ciphertext
            expect(ciphertext).toBeDefined()

            // create a message River event from the encrypted event
            const messagePayload = make_ChannelPayload_Message({
                senderKey: event.senderKey,
                sessionId: event.event.getWireContentChannel().content.session_id,
                algorithm: MEGOLM_ALGORITHM,
                text: ciphertext!,
            })
            encryptedEvents.push(
                new RiverEvent({
                    payload: {
                        parsed_event: messagePayload,
                        creator_user_id: event.senderUser,
                    },
                    channel_id: bobsChannelId,
                }),
            )
        }

        // alternate decrypting events between alice and bob's client
        // alice should decrypt events encrypted by bob and vice versa
        let j = 0
        for (const encryptedEvent of encryptedEvents) {
            if (j === numEvents) {
                break
            }
            const client =
                encryptedEvent.event.sender == bobsClient.userId ? alicesClient : bobsClient
            expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
            expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
            const content = encryptedEvent.getContentChannel()
            // note: at times jest toBeUnDefined() fails to detect undefined here
            expect(content?.content === undefined).toBe(true)
            await expect(client.decryptEventIfNeeded(encryptedEvent)).toResolve()
            const clearContent = encryptedEvent.getClearContent_ChannelMessage()
            expect(clearContent?.payload).toBeDefined()
            if (
                clearContent?.payload?.case === 'post' &&
                clearContent?.payload?.value?.content?.case === 'text'
            ) {
                expect(clearContent?.payload?.value?.content.value?.body).toContain(
                    'secret encrypted message',
                )
            }
            j++
        }

        // alice should decrypt events encrypted by alice and same for bob
        let k = 0
        for (const encryptedEvent of encryptedEvents) {
            if (k < numEvents) {
                k++
                continue
            }
            const client =
                encryptedEvent.event.sender == bobsClient.userId ? bobsClient : alicesClient
            expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
            expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
            const content = encryptedEvent.getContentChannel()
            expect(content.content).toBeUnDefined()
            await expect(client.decryptEventIfNeeded(encryptedEvent)).toResolve()
            const clearContent = encryptedEvent.getClearContent_ChannelMessage()
            expect(clearContent?.payload).toBeDefined()
            if (
                clearContent?.payload?.case === 'post' &&
                clearContent?.payload?.value?.content?.case === 'text'
            ) {
                expect(clearContent?.payload?.value?.content.value?.body).toContain(
                    'encrypted message!',
                )
            }
            k++
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

        const payload = JSON.stringify({
            sender: bobsClient.userId,
            content: 'First secret encrypted message!',
        })
        // create a message to encrypt
        const event = new RiverEvent({
            content: {
                content: {
                    content: make_ChannelMessage_Post_Content_Text(payload),
                    algorithm: MEGOLM_ALGORITHM,
                },
            },
            sender: bobsClient.userId,
            stream_type: EncryptedEventStreamTypes.Channel,
        })
        expect(event.event.content).toBeDefined()
        await expect(bobsClient.encryptEvent(event, { channelId: bobsChannelId })).toResolve()
        expect(event.shouldAttemptDecryption()).toBe(false)
        expect(event.getWireContentChannel().content.ciphertext).toBeDefined()
        const senderKey = bobsClient.olmDevice.deviceCurve25519Key
        if (!senderKey) {
            throw new Error('Sender key not found')
        }

        // create a message event from the encrypted event and decrypt it
        const messagePayload = make_ChannelPayload_Message({
            senderKey: senderKey,
            sessionId: event.getWireContentChannel().content.session_id,
            algorithm: MEGOLM_ALGORITHM,
            text: event.getWireContentChannel().content.ciphertext!,
        })

        const encryptedEvent = new RiverEvent({
            payload: {
                parsed_event: messagePayload,
                creator_user_id: bobsClient.userId,
            },
            channel_id: bobsChannelId,
        })
        expect(encryptedEvent.shouldAttemptDecryption()).toBe(true)
        expect(encryptedEvent.getWireContentChannel().content.ciphertext).toBeDefined()
        const content = encryptedEvent.getContentChannel()
        expect(content?.content).toBeUndefined()
        // note: we need to delete session from crypto store since session store is shared
        // in node test environment.
        alicesClient.cryptoStore?.deleteInboundGroupSessions(
            encryptedEvent.getWireContentChannel().content.sender_key ?? '',
            encryptedEvent.getWireContentChannel().content.session_id ?? '',
        )
        await expect(alicesClient.decryptEventIfNeeded(encryptedEvent)).toResolve()
        const clear = encryptedEvent.getClearContent_ChannelMessage()
        if (clear && clear.payload && clear.opts) {
            expect(clear.opts.msgtype).toEqual('m.bad.encrypted')
        }
    })

    test('encryptDecryptChannelMessageSentOverClient', async () => {
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

    test('encryptedChannelMessageReturnsCiphertext', async () => {
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
                    expect(isCiphertext(wireEvent!)).toBe(true)
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
