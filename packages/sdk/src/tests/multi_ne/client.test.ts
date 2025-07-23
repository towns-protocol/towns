/**
 * @group main
 */

import { dlog, check } from '@towns-protocol/dlog'
import { isDefined } from '../../check'
import { GroupEncryptionAlgorithmId, UserDevice } from '@towns-protocol/encryption'
import { DecryptionStatus } from '../../decryptionExtensions'
import {
    makeUserStreamId,
    makeUserSettingsStreamId,
    makeUserMetadataStreamId,
    makeUserInboxStreamId,
    makeUniqueChannelStreamId,
    addressFromUserId,
    makeUniqueMediaStreamId,
} from '../../id'
import {
    makeDonePromise,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
    getChannelMessagePayload,
    makeRandomUserAddress,
    TestClient,
    cloneTestClient,
    SignerContextWithWallet,
    getTimelineMessagePayload,
} from '../testUtils'
import {
    CancelSyncResponse,
    ChannelMessage,
    ChannelMessageSchema,
    SnapshotCaseType,
    SyncOp,
    SyncStreamsResponse,
    type ChunkedMedia,
    SyncStreamsRequestSchema,
    PlainMessage,
    SyncStreamsResponseSchema,
    CancelSyncResponseSchema,
    CancelSyncRequestSchema,
    MediaInfoSchema,
} from '@towns-protocol/proto'
import { create, MessageInitShape, toBinary } from '@bufbuild/protobuf'
import { CallOptions } from '@connectrpc/connect'
import { vi } from 'vitest'
import {
    make_ChannelPayload_Message,
    make_MemberPayload_KeyFulfillment,
    make_MemberPayload_KeySolicitation,
} from '../../types'
import { deriveKeyAndIV } from '@towns-protocol/sdk-crypto'
import { nanoid } from 'nanoid'
import { RiverTimelineEvent, TimelineEvent } from '../../views/models/timelineTypes'

const log = dlog('csb:test')

const createMockSyncGenerator = (shouldFail: () => boolean, updateEmitted?: () => void) => {
    let syncCanceled = false
    let syncStarted = false

    const generatorFunction = () => {
        if (shouldFail()) {
            updateEmitted?.()
            syncStarted = false
            syncCanceled = false
            throw new TypeError('fetch failed')
        }
        if (syncCanceled) {
            log('emitting close')
            return Promise.resolve(
                create(SyncStreamsResponseSchema, {
                    syncId: 'mockSyncId',
                    syncOp: SyncOp.SYNC_CLOSE,
                }),
            )
        }
        if (!syncStarted) {
            syncStarted = true
            log('emitting new')
            return Promise.resolve(
                create(SyncStreamsResponseSchema, {
                    syncId: 'mockSyncId',
                    syncOp: SyncOp.SYNC_NEW,
                }),
            )
        } else {
            log('emitting junk')
            updateEmitted?.()
            return Promise.resolve(
                create(SyncStreamsResponseSchema, {
                    syncId: 'mockSyncId',
                    syncOp: SyncOp.SYNC_UPDATE,
                    stream: { events: [], nextSyncCookie: {} },
                }),
            )
        }
    }

    generatorFunction.setSyncCancelled = () => {
        syncCanceled = true
    }

    return generatorFunction
}
function makeMockSyncGenerator(generator: () => Promise<SyncStreamsResponse>) {
    const obj = {
        [Symbol.asyncIterator]: async function* asyncGenerator() {
            while (true) {
                yield generator()
            }
        },
    }

    return obj
}

describe('clientTest', () => {
    let bobsClient: TestClient
    let alicesClient: TestClient

    beforeEach(async () => {
        bobsClient = await makeTestClient()
        alicesClient = await makeTestClient()
    })

    afterEach(async () => {
        await bobsClient.stop()
        await alicesClient.stop()
    })

    test('bobTalksToHimself-noflush', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        const channelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.not.toThrow()
        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, channelId),
        ).resolves.not.toThrow()

        const stream = await bobsClient.waitForStream(channelId)
        await bobsClient.sendMessage(channelId, 'Hello, world!')

        await waitFor(() => {
            const event = stream.view.timeline.find(
                (e) => getTimelineMessagePayload(e) === 'Hello, world!',
            )
            expect(event).toBeDefined()
            expect(event?.confirmedInBlockNum).toBeDefined()
        })

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect(bobsClient.signerContext)).resolves.not.toThrow()

        log('pass2 done')
    })

    test('bobSendsBadPrevMiniblockHashShouldResolve', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        const channelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.not.toThrow()
        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, channelId),
        ).resolves.not.toThrow()

        await bobsClient.waitForStream(channelId)

        // send a bunch of messages and force some snapshots to push the events out of the view
        for (let i = 0; i < 10; i++) {
            await bobsClient.sendMessage(channelId, `Hello ${i}`)
            await bobsClient.debugForceMakeMiniblock(channelId, { forceSnapshot: true })
        }

        // hand construct a message, (don't do this normally! just use sendMessage(..))
        const algorithm = GroupEncryptionAlgorithmId.GroupEncryption // algorithm doesn't matter here, don't copy paste
        const channelMessage = create(ChannelMessageSchema, {
            payload: {
                case: 'post',
                value: {
                    content: {
                        case: 'text',
                        value: { body: 'Hello world', mentions: [], attachments: [] },
                    },
                },
            },
        } satisfies PlainMessage<ChannelMessage>)
        const encrypted = await bobsClient.encryptGroupEvent(
            toBinary(ChannelMessageSchema, channelMessage),
            channelId,
            algorithm,
        )
        check(isDefined(encrypted), 'encrypted should be defined')
        const message = make_ChannelPayload_Message(encrypted)
        await expect(
            bobsClient.makeEventWithHashAndAddToStream(
                channelId,
                message,
                Uint8Array.from(Array(32).fill(0)), // just going to throw any old thing in there... the retry should pick it up
                BigInt(0),
            ),
        ).resolves.not.toThrow()
    })

    test('clientsCanBeClosedNoSync', async () => {})

    test('clientsRetryOnSyncErrorDuringStart', async () => {
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        const done = makeDonePromise()

        let syncOpCount = 0

        const generator = createMockSyncGenerator(() => syncOpCount++ < 2)
        const spy = vi
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: MessageInitShape<typeof SyncStreamsRequestSchema>,
                    _options?: CallOptions,
                ): AsyncIterable<SyncStreamsResponse> => {
                    return makeMockSyncGenerator(generator)
                },
            )

        alicesClient.on('streamSyncActive', (active: boolean) => {
            if (active) {
                done.done()
            }
        })
        alicesClient.startSync()

        await expect(done.expectToSucceed()).resolves.not.toThrow()
        const cancelSyncSpy = vi
            .spyOn(alicesClient.rpcClient, 'cancelSync')
            .mockImplementation(
                (
                    request: MessageInitShape<typeof CancelSyncRequestSchema>,
                    _options?: CallOptions,
                ): Promise<CancelSyncResponse> => {
                    log('mocked cancelSync', request)
                    generator.setSyncCancelled()
                    return Promise.resolve(create(CancelSyncResponseSchema, {}))
                },
            )

        await alicesClient.stopSync()
        spy.mockRestore()
        cancelSyncSpy.mockRestore()
    })

    test('clientsResetsRetryCountAfterSyncSuccess', async () => {
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        const done = makeDonePromise()

        let syncOpCount = 0

        const generator = createMockSyncGenerator(
            () => syncOpCount > 2 && syncOpCount < 4,
            () => syncOpCount++,
        )
        const spy = vi
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: MessageInitShape<typeof SyncStreamsRequestSchema>,
                    _options?: CallOptions,
                ): AsyncIterable<SyncStreamsResponse> => {
                    return makeMockSyncGenerator(generator)
                },
            )

        alicesClient.on('streamSyncActive', (active: boolean) => {
            if (syncOpCount > 3 && active) {
                done.done()
            }
        })
        alicesClient.startSync()

        await expect(done.expectToSucceed()).resolves.not.toThrow()
        const cancelSyncSpy = vi
            .spyOn(alicesClient.rpcClient, 'cancelSync')
            .mockImplementation(
                (
                    request: MessageInitShape<typeof CancelSyncRequestSchema>,
                    _options?: CallOptions,
                ): Promise<CancelSyncResponse> => {
                    log('mocked cancelSync', request)
                    generator.setSyncCancelled()
                    return Promise.resolve(create(CancelSyncResponseSchema, {}))
                },
            )

        await alicesClient.stopSync()
        spy.mockRestore()
        cancelSyncSpy.mockRestore()
    })
    test('clientCreatesStreamsForNewUser', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        expect(bobsClient.streams.size()).toEqual(4)
        expect(bobsClient.streams.get(makeUserSettingsStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserInboxStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserMetadataStreamId(bobsClient.userId))).toBeDefined()
    })

    test('clientCreatesStreamsForExistingUser', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        const bobsAnotherClient = await cloneTestClient(bobsClient)
        await expect(bobsAnotherClient.initializeUser()).resolves.not.toThrow()
        expect(bobsAnotherClient.streams.size()).toEqual(4)
        expect(
            bobsAnotherClient.streams.get(makeUserSettingsStreamId(bobsClient.userId)),
        ).toBeDefined()
        expect(bobsAnotherClient.streams.get(makeUserStreamId(bobsClient.userId))).toBeDefined()
        expect(
            bobsAnotherClient.streams.get(makeUserMetadataStreamId(bobsClient.userId)),
        ).toBeDefined()
    })

    test('bobCanSendMemberPayload', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        expect(bobsClient.userSettingsStreamId).toBeDefined()

        // fulfillment without matching solicitation should fail
        let payload = make_MemberPayload_KeyFulfillment({
            deviceKey: 'foo',
            userAddress: makeRandomUserAddress(),
            sessionIds: ['bar'],
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).rejects.toThrow('INVALID_ARGUMENT')

        // solicitation with no keys should fail
        payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'foo',
            sessionIds: [],
            fallbackKey: 'baz',
            isNewDevice: false,
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).rejects.toThrow('INVALID_ARGUMENT')

        // solicitation with empty key should fail
        payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'foo',
            sessionIds: [''],
            fallbackKey: 'baz',
            isNewDevice: false,
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).rejects.toThrow('INVALID_ARGUMENT')

        // solicitation for isNewDevice should resolve
        payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'foo',
            sessionIds: [],
            fallbackKey: 'baz',
            isNewDevice: true,
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).resolves.not.toThrow()

        // see solicitation in view
        await waitFor(() => {
            const stream = bobsClient.streams.get(bobsClient.userSettingsStreamId!)
            const solicitation = stream?.view.membershipContent.joined
                .get(bobsClient.userId)
                ?.solicitations.find((x) => x.deviceKey === 'foo')
            expect(solicitation).toBeDefined()
            expect(solicitation?.isNewDevice).toEqual(true)
        })

        // fulfillment should resolve
        payload = make_MemberPayload_KeyFulfillment({
            deviceKey: 'foo',
            userAddress: addressFromUserId(bobsClient.userId),
            sessionIds: [],
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).resolves.not.toThrow()

        // fullfillment should remove solicitation from view
        await waitFor(() => {
            const stream = bobsClient.streams.get(bobsClient.userSettingsStreamId!)
            const solicitation = stream?.view.membershipContent.joined
                .get(bobsClient.userId)
                ?.solicitations.find((x) => x.deviceKey === 'foo')
            expect(solicitation).toBeDefined()
            expect(solicitation?.isNewDevice).toEqual(false)
        })

        // fulfillment with empty session ids should now fail
        payload = make_MemberPayload_KeyFulfillment({
            deviceKey: 'foo',
            userAddress: addressFromUserId(bobsClient.userId),
            sessionIds: [],
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).rejects.toThrow('PERMISSION_DENIED')
    })

    test('bobCreatesUnamedSpaceAndStream', async () => {
        log('bobCreatesUnamedSpace')

        // Bob gets created, creates a space without providing an ID, and a channel without providing an ID.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const spaceId = makeUniqueSpaceStreamId()
        const spacePromise = bobsClient.createSpace(spaceId)
        await expect(spacePromise).resolves.not.toThrow()
        const channelName = 'Bobs channel'
        const channelTopic = 'Bobs channel topic'
        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, channelName, channelTopic, channelId),
        ).resolves.not.toThrow()
        await expect(bobsClient.stopSync()).resolves.not.toThrow()
    })

    const bobCanReconnect = async (signer: SignerContextWithWallet) => {
        const bobsAnotherClient = await makeTestClient({ context: signer, deviceId: 'd2' })
        const bobsOneMoreAnotherClient = await makeTestClient({ context: signer, deviceId: 'd3' })

        const eventDecryptedPromise = makeDonePromise()
        const streamInitializedPromise = makeDonePromise()

        let channelWithContentId: string | undefined

        const onEventDecrypted = (
            streamId: string,
            contentKind: SnapshotCaseType,
            event: TimelineEvent,
        ): void => {
            try {
                log(event)
                check(event.content?.kind === RiverTimelineEvent.ChannelMessage)
                expect(event.content.body).toContain('Hello, again!')
                expect(streamId).toBe(channelWithContentId)
                //This done should be inside of the if statement to be sure that check happened.
                eventDecryptedPromise.done()
            } catch (e) {
                log('onEventDecrypted error', e)
                eventDecryptedPromise.reject(e)
            }
        }

        const channelWithContentIdPromise = makeDonePromise()
        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            try {
                if (streamKind === 'channelContent') {
                    channelWithContentId = streamId
                    channelWithContentIdPromise.done()
                    const channel = bobsAnotherClient.stream(streamId)!
                    log('!!!channel content')
                    log(channel.view.timeline)

                    const messages = channel.view.timeline.filter(
                        (x) =>
                            x.content?.kind === RiverTimelineEvent.ChannelMessage ||
                            x.content?.kind === RiverTimelineEvent.ChannelMessageEncrypted ||
                            x.content?.kind === RiverTimelineEvent.ChannelMessageEncryptedWithRef,
                    )
                    expect(messages).toHaveLength(1)
                    //This done should be inside of the if statement to be sure that check happened.
                    streamInitializedPromise.done()
                }
            } catch (e) {
                log('onStreamInitialized error', e)
                streamInitializedPromise.reject(e)
            }
        }
        bobsAnotherClient.on('streamInitialized', onStreamInitialized)
        await expect(bobsAnotherClient.initializeUser()).resolves.not.toThrow()
        bobsAnotherClient.startSync()

        bobsOneMoreAnotherClient.on('eventDecrypted', onEventDecrypted)
        await expect(bobsOneMoreAnotherClient.initializeUser()).resolves.not.toThrow()
        bobsOneMoreAnotherClient.startSync()

        await channelWithContentIdPromise.expectToSucceed()
        expect(channelWithContentId).toBeDefined()
        await bobsAnotherClient.sendMessage(channelWithContentId!, 'Hello, again!')

        await streamInitializedPromise.expectToSucceed()
        await eventDecryptedPromise.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }

    test('bobSendsSingleMessage', async () => {
        log('bobSendsSingleMessage')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.not.toThrow()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).resolves.not.toThrow()

        // Bob can send a message.
        const stream = await bobsClient.waitForStream(bobsChannelId)

        await expect(
            bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!'),
        ).resolves.not.toThrow()
        await waitFor(() => {
            const event = stream.view.timeline.find(
                (e) => getTimelineMessagePayload(e) === 'Hello, world from Bob!',
            )
            expect(event).toBeDefined()
            expect(event?.confirmedInBlockNum).toBeDefined()
        })

        log('bobSendsSingleMessage done')
    })

    test('bobPinsAMessage', async () => {
        log('bobPinsAMessage')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.not.toThrow()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).resolves.not.toThrow()

        // Bob can send a message.
        const channelStream = await bobsClient.waitForStream(bobsChannelId)

        const { eventId: eventId_1 } = await bobsClient.sendMessage(
            bobsChannelId,
            'Hello, world from Bob!',
        )
        const { eventId: eventId_2 } = await bobsClient.sendMessage(bobsChannelId, 'event 2')
        const { eventId: eventId_3 } = await bobsClient.sendMessage(bobsChannelId, 'event 3')

        await bobsClient.pin(bobsChannelId, eventId_1)

        await waitFor(() => {
            const pin = channelStream.view.membershipContent.pins.find(
                (e) => e.event.hashStr === eventId_1,
            )
            expect(pin).toBeDefined()
            expect(pin?.event.decryptedContent?.kind).toBe('channelMessage')
            if (pin?.event.decryptedContent?.kind === 'channelMessage') {
                expect(getChannelMessagePayload(pin?.event.decryptedContent?.content)).toBe(
                    'Hello, world from Bob!',
                )
            }
        })

        await expect(bobsClient.pin(bobsChannelId, eventId_1)).rejects.toThrow(
            'message is already pinned',
        )

        await bobsClient.unpin(bobsChannelId, eventId_1)

        await waitFor(() => {
            expect(channelStream.view.membershipContent.pins.length).toBe(0)
        })

        await bobsClient.pin(bobsChannelId, eventId_1)
        await bobsClient.pin(bobsChannelId, eventId_2)
        await bobsClient.pin(bobsChannelId, eventId_3)

        await bobsClient.debugForceMakeMiniblock(bobsChannelId, { forceSnapshot: true })

        await waitFor(() => {
            const pin = channelStream.view.membershipContent.pins.find(
                (e) => e.event.hashStr === eventId_1,
            )
            expect(pin).toBeDefined()
        })
        await waitFor(() => {
            const pin = channelStream.view.membershipContent.pins.find(
                (e) => e.event.hashStr === eventId_2,
            )
            expect(pin).toBeDefined()
        })
        await waitFor(() => {
            const pin = channelStream.view.membershipContent.pins.find(
                (e) => e.event.hashStr === eventId_3,
            )
            expect(pin).toBeDefined()
        })

        await bobsClient.unpin(bobsChannelId, eventId_1)
        await bobsClient.unpin(bobsChannelId, eventId_2)
        await bobsClient.debugForceMakeMiniblock(bobsChannelId, { forceSnapshot: true })

        const rawStream = await bobsClient.getStream(bobsChannelId)
        expect(rawStream).toBeDefined()
        expect(rawStream?.membershipContent.pins.length).toBe(1)
        expect(rawStream?.membershipContent.pins[0].event.hashStr).toBe(eventId_3)

        log('bobSendsSingleMessage done')
    })

    test('bobAndAliceConverse', async () => {
        log('bobAndAliceConverse')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.not.toThrow()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).resolves.not.toThrow()
        await expect(bobsClient.waitForStream(bobsChannelId)).resolves.not.toThrow()

        // Alice gest created.
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        // Alice can't sent a message to Bob's channel.
        // TODO: since Alice doesn't sync Bob's channel, this fails fast (i.e. stream is unknown to Alice's client).
        // It would be interesting for Alice to sync this channel, and then try to send a message.
        await expect(
            alicesClient.sendMessage(bobsChannelId, 'Hello, world from Alice!'),
        ).rejects.toThrow()

        // Alice waits for invite to Bob's channel.
        const aliceJoined = makeDonePromise()
        alicesClient.on('userInvitedToStream', (streamId: string) => {
            void (async () => {
                try {
                    expect(streamId).toBe(bobsChannelId)
                    await expect(alicesClient.joinStream(streamId)).resolves.not.toThrow()
                    aliceJoined.done()
                } catch (e) {
                    aliceJoined.reject(e)
                }
            })()
        })

        // Bob invites Alice to his channel.
        await bobsClient.inviteUser(bobsChannelId, alicesClient.userId)

        await aliceJoined.expectToSucceed()

        const aliceGetsMessage = makeDonePromise()
        const bobGetsMessage = makeDonePromise()
        const conversation = [
            'Hello, world from Bob!',
            'Hello, Alice!',
            'Hello, Bob!',
            'Weather nice?',
            'Sun and rain!',
            'Coffee or tea?',
            'Both!',
        ]

        alicesClient.on(
            'eventDecrypted',
            (streamId: string, contentKind: SnapshotCaseType, event: TimelineEvent): void => {
                const channelId = streamId
                const content = event.content
                expect(content).toBeDefined()
                log('eventDecrypted', 'Alice', channelId)
                void (async () => {
                    try {
                        expect(channelId).toBe(bobsChannelId)
                        check(event.content?.kind === RiverTimelineEvent.ChannelMessage)
                        const clearEvent = event.content
                        const body = clearEvent.body
                        // @ts-ignore
                        expect(conversation).toContain(body)
                        if (body === 'Hello, Alice!') {
                            await alicesClient.sendMessage(channelId, 'Hello, Bob!')
                        } else if (body === 'Weather nice?') {
                            await alicesClient.sendMessage(channelId, 'Sun and rain!')
                        } else if (body === 'Coffee or tea?') {
                            await alicesClient.sendMessage(channelId, 'Both!')
                            aliceGetsMessage.done()
                        }
                    } catch (e) {
                        log('streamInitialized error', e)
                        aliceGetsMessage.reject(e)
                    }
                })()
            },
        )

        bobsClient.on(
            'eventDecrypted',
            (streamId: string, contentKind: SnapshotCaseType, event: TimelineEvent): void => {
                const channelId = streamId
                const content = event.content
                expect(content).toBeDefined()
                log('eventDecrypted', 'Bob', channelId)

                void (async () => {
                    try {
                        expect(channelId).toBe(bobsChannelId)
                        check(event.content?.kind === RiverTimelineEvent.ChannelMessage)
                        const clearEvent = event.content
                        const body = clearEvent.body
                        // @ts-ignore
                        expect(conversation).toContain(body)
                        if (body === 'Hello, Bob!') {
                            await bobsClient.sendMessage(channelId, 'Weather nice?')
                        } else if (body === 'Sun and rain!') {
                            await bobsClient.sendMessage(channelId, 'Coffee or tea?')
                        } else if (body === 'Both!') {
                            bobGetsMessage.done()
                        }
                    } catch (e) {
                        log('streamInitialized error', e)
                        bobGetsMessage.reject(e)
                    }
                })()
            },
        )

        await expect(
            bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!'),
        ).resolves.not.toThrow()
        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, Alice!')).resolves.not.toThrow()

        log('Waiting for Alice to get messages...')
        await aliceGetsMessage.expectToSucceed()
        log('Waiting for Bob to get messages...')
        await bobGetsMessage.expectToSucceed()
        log('bobAndAliceConverse All done!')
    })

    test('bobUploadsDeviceKeys', async () => {
        log('bobUploadsDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfInbox = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, userDevice)
                bobSelfInbox.runAndDone(() => {
                    expect(streamId).toBe(bobUserMetadataStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        const bobUserMetadataStreamId = bobsClient.userMetadataStreamId
        await bobSelfInbox.expectToSucceed()
    })

    test('bobDownloadsOwnDeviceKeys', async () => {
        log('bobDownloadsOwnDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfInbox = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: UserDevice): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, deviceKeys)
                bobSelfInbox.runAndDone(() => {
                    expect(streamId).toBe(bobUserMetadataStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const bobUserMetadataStreamId = bobsClient.userMetadataStreamId
        await bobSelfInbox.expectToSucceed()
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([bobsUserId])
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesDeviceKeys', async () => {
        log('bobDownloadsAlicesDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        alicesClient.startSync()
        const alicesUserId = alicesClient.userId
        const alicesSelfInbox = makeDonePromise()
        alicesClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: UserDevice): void => {
                log('userDeviceKeyMessage for Alice', streamId, userId, deviceKeys)
                alicesSelfInbox.runAndDone(() => {
                    expect(streamId).toBe(aliceUserMetadataStreamId)
                    expect(userId).toBe(alicesUserId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserMetadataStreamId = alicesClient.userMetadataStreamId
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId])
        expect(deviceKeys[alicesUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnDeviceKeys', async () => {
        log('bobDownloadsAlicesAndOwnDeviceKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfInbox = makeDonePromise()
        // bobs client should sync userDeviceKeyMessage twice (once for alice, once for bob)
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: UserDevice): void => {
                log('userDeviceKeyMessage', streamId, userId, deviceKeys)
                bobSelfInbox.runAndDone(() => {
                    expect([bobUserMetadataStreamId, aliceUserMetadataStreamId]).toContain(streamId)
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserMetadataStreamId = alicesClient.userMetadataStreamId
        const bobUserMetadataStreamId = bobsClient.userMetadataStreamId
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId, bobsUserId])
        expect(Object.keys(deviceKeys).length).toEqual(2)
        expect(deviceKeys[alicesUserId]).toBeDefined()
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnFallbackKeys', async () => {
        log('bobDownloadsAlicesAndOwnFallbackKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys, including
        // fallback keys.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfInbox = makeDonePromise()
        // bobs client should sync userDeviceKeyMessage twice (once for alice, once for bob)
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: UserDevice): void => {
                log('userDeviceKeyMessage', streamId, userId, deviceKeys)
                bobSelfInbox.runAndDone(() => {
                    expect([bobUserMetadataStreamId, aliceUserMetadataStreamId]).toContain(streamId)
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserMetadataStreamId = alicesClient.userMetadataStreamId
        const bobUserMetadataStreamId = bobsClient.userMetadataStreamId
        const fallbackKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId, bobsUserId])

        expect(fallbackKeys).toBeDefined()
        expect(Object.keys(fallbackKeys).length).toEqual(2)
    })

    test('bobDownloadsAlicesFallbackKeys', async () => {
        log('bobDownloadsAlicesFallbackKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys, including
        // fallback keys.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        alicesClient.startSync()
        await waitFor(() => {
            // @ts-ignore
            expect(alicesClient.decryptionExtensions?.status).toEqual(DecryptionStatus.done)
        })
        const alicesUserId = alicesClient.userId

        const fallbackKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId])
        expect(Object.keys(fallbackKeys)).toContain(alicesUserId)
        expect(Object.keys(fallbackKeys).length).toEqual(1)
        expect(fallbackKeys[alicesUserId].map((k) => k.fallbackKey)).toContain(
            alicesClient.userDeviceKey().fallbackKey,
        )
    })

    test('aliceLeavesChannelsWhenLeavingSpace', async () => {
        log('aliceLeavesChannelsWhenLeavingSpace')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).resolves.not.toThrow()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).resolves.not.toThrow()
        await expect(bobsClient.waitForStream(bobsChannelId)).resolves.not.toThrow()

        // Alice gest created.
        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()

        await expect(alicesClient.joinStream(bobsSpaceId)).resolves.not.toThrow()
        await expect(alicesClient.joinStream(bobsChannelId)).resolves.not.toThrow()
        const channelStream = bobsClient.stream(bobsChannelId)
        expect(channelStream).toBeDefined()
        await waitFor(() => {
            expect(channelStream?.view.getMembers().joinedUsers).toContain(alicesClient.userId)
        })
        // leave the space
        await expect(alicesClient.leaveStream(bobsSpaceId)).resolves.not.toThrow()

        // the channel should be left as well
        await waitFor(() => {
            expect(channelStream?.view.getMembers().joinedUsers).not.toContain(alicesClient.userId)
        })
        await alicesClient.stopSync()
    })

    test('clientReturnsKnownDevicesForUserId', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()

        await expect(alicesClient.initializeUser()).resolves.not.toThrow()
        alicesClient.startSync()
        await waitFor(() => {
            // @ts-ignore
            expect(alicesClient.decryptionExtensions?.status).toEqual(DecryptionStatus.done)
        })

        await expect(
            bobsClient.downloadUserDeviceInfo([alicesClient.userId]),
        ).resolves.not.toThrow()
        const knownDevices = await bobsClient.knownDevicesForUserId(alicesClient.userId)

        expect(knownDevices.length).toBe(1)
        expect(knownDevices[0].fallbackKey).toBe(alicesClient.userDeviceKey().fallbackKey)
    })

    // Make sure that the client only uploads device keys
    // if this exact device key does not exist.
    test('clientOnlyUploadsDeviceKeysOnce', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const stream = bobsClient.stream(bobsClient.userMetadataStreamId!)!

        const waitForInitialUpload = makeDonePromise()
        stream.on('userDeviceKeyMessage', () => {
            waitForInitialUpload.done()
        })
        await waitForInitialUpload.expectToSucceed()

        for (let i = 0; i < 5; i++) {
            await bobsClient.uploadDeviceKeys()
        }

        const keys = stream.view.userMetadataContent.deviceKeys
        expect(keys).toHaveLength(1)
    })

    test('setUserProfilePicture', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = bobsClient.userMetadataStreamId!
        const userMetadataStream = await bobsClient.waitForStream(streamId)

        // assert assumptionsP
        expect(userMetadataStream).toBeDefined()

        // make a space image event
        const mediaStreamId = makeUniqueMediaStreamId()
        const image = create(MediaInfoSchema, {
            mimetype: 'image/png',
            filename: 'bob-1.png',
        })
        const { key, iv } = await deriveKeyAndIV(nanoid(128)) // if in browser please use window.crypto.subtle.generateKey
        const chunkedMediaInfo = {
            info: image,
            streamId: mediaStreamId,
            encryption: {
                case: 'aesgcm',
                value: { secretKey: key, iv },
            },
            thumbnail: undefined,
        } satisfies PlainMessage<ChunkedMedia>

        await bobsClient.setUserProfileImage(chunkedMediaInfo)
        await waitFor(() =>
            expect(userMetadataStream.view.userMetadataContent.encryptedProfileImage).toBeDefined(),
        )

        const decrypted = await bobsClient.getUserProfileImage(bobsClient.userId)
        expect(decrypted).toBeDefined()
        expect(decrypted?.info?.mimetype).toBe(image.mimetype)
        expect(decrypted?.info?.filename).toBe(image.filename)
        expect(decrypted?.encryption.case).toBe(chunkedMediaInfo.encryption.case)
        expect(decrypted?.encryption.value?.secretKey).toBeDefined()
    })

    test('setUserBio', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = bobsClient.userMetadataStreamId!
        const userMetadataStream = await bobsClient.waitForStream(streamId)

        expect(userMetadataStream).toBeDefined()

        const bio = { bio: 'Hello, world!' }
        await bobsClient.setUserBio(bio)
        await waitFor(() =>
            expect(userMetadataStream.view.userMetadataContent.encryptedBio).toBeDefined(),
        )

        const decrypted = await bobsClient.getUserBio(bobsClient.userId)
        expect(decrypted?.bio).toStrictEqual(bio.bio)
    })

    test('setUserBio empty', async () => {
        await expect(bobsClient.initializeUser()).resolves.not.toThrow()
        bobsClient.startSync()
        const streamId = bobsClient.userMetadataStreamId!
        const userMetadataStream = await bobsClient.waitForStream(streamId)

        expect(userMetadataStream).toBeDefined()

        const bio = { bio: '' }
        await bobsClient.setUserBio(bio)
        await waitFor(() =>
            expect(userMetadataStream.view.userMetadataContent.encryptedBio).toBeDefined(),
        )

        const decrypted = await bobsClient.getUserBio(bobsClient.userId)
        expect(decrypted?.bio).toStrictEqual(bio.bio)
    })
})
