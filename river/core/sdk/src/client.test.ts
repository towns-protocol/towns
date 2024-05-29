/**
 * @group main
 */

import { dlog, check } from '@river-build/dlog'
import { isDefined } from './check'
import { DecryptionStatus, UserDevice } from '@river-build/encryption'
import { Client } from './client'
import {
    makeUserStreamId,
    makeUserSettingsStreamId,
    makeUserDeviceKeyStreamId,
    makeUserInboxStreamId,
    makeUniqueChannelStreamId,
    addressFromUserId,
} from './id'
import {
    makeDonePromise,
    makeTestClient,
    makeUniqueSpaceStreamId,
    waitFor,
    getChannelMessagePayload,
    makeRandomUserAddress,
} from './util.test'
import {
    CancelSyncRequest,
    CancelSyncResponse,
    ChannelMessage,
    SnapshotCaseType,
    SyncOp,
    SyncStreamsRequest,
    SyncStreamsResponse,
} from '@river-build/proto'
import { PartialMessage } from '@bufbuild/protobuf'
import { CallOptions } from '@connectrpc/connect'
// This is needed to get the jest itnerface for using in spyOn
// eslint-disable-next-line import/no-extraneous-dependencies
import { jest } from '@jest/globals'
import {
    DecryptedTimelineEvent,
    make_ChannelPayload_Message,
    make_MemberPayload_KeyFulfillment,
    make_MemberPayload_KeySolicitation,
} from './types'
import { SignerContext } from './signerContext'

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
                new SyncStreamsResponse({
                    syncId: 'mockSyncId',
                    syncOp: SyncOp.SYNC_CLOSE,
                }),
            )
        }
        if (!syncStarted) {
            syncStarted = true
            log('emitting new')
            return Promise.resolve(
                new SyncStreamsResponse({
                    syncId: 'mockSyncId',
                    syncOp: SyncOp.SYNC_NEW,
                }),
            )
        } else {
            log('emitting junk')
            updateEmitted?.()
            return Promise.resolve(
                new SyncStreamsResponse({
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

    test('bobTalksToHimself-noflush', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        const channelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()
        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, channelId),
        ).toResolve()

        const stream = await bobsClient.waitForStream(channelId)
        await bobsClient.sendMessage(channelId, 'Hello, world!')

        await waitFor(() => {
            const event = stream.view.timeline.find(
                (e) => getChannelMessagePayload(e.localEvent?.channelMessage) === 'Hello, world!',
            )
            expect(event).toBeDefined()
            expect(event?.remoteEvent).toBeDefined()
        })

        await bobsClient.stopSync()

        log('pass1 done')

        await expect(bobCanReconnect(bobsClient.signerContext)).toResolve()

        log('pass2 done')
    })

    test('bobSendsBadPrevMiniblockHashShouldResolve', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        const channelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()
        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, channelId),
        ).toResolve()

        await bobsClient.waitForStream(channelId)

        // hand construct a message, (don't do this normally! just use sendMessage(..))
        const encrypted = await bobsClient.encryptGroupEvent(
            new ChannelMessage({
                payload: {
                    case: 'post',
                    value: {
                        content: {
                            case: 'text',
                            value: { body: 'Hello world' },
                        },
                    },
                },
            }),
            channelId,
        )
        check(isDefined(encrypted), 'encrypted should be defined')
        const message = make_ChannelPayload_Message(encrypted)
        await expect(
            bobsClient.makeEventWithHashAndAddToStream(
                channelId,
                message,
                Uint8Array.from(Array(32).fill(0)), // just going to throw any old thing in there... the retry should pick it up
            ),
        ).toResolve()
    })

    test('clientsCanBeClosedNoSync', async () => {})

    test('clientsRetryOnSyncErrorDuringStart', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const done = makeDonePromise()

        let syncOpCount = 0

        const generator = createMockSyncGenerator(() => syncOpCount++ < 2)
        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: PartialMessage<SyncStreamsRequest>,
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

        await expect(done.expectToSucceed()).toResolve()
        const cancelSyncSpy = jest
            .spyOn(alicesClient.rpcClient, 'cancelSync')
            .mockImplementation(
                (
                    request: PartialMessage<CancelSyncRequest>,
                    _options?: CallOptions,
                ): Promise<CancelSyncResponse> => {
                    log('mocked cancelSync', request)
                    generator.setSyncCancelled()
                    return Promise.resolve(new CancelSyncResponse({}))
                },
            )

        await alicesClient.stopSync()
        spy.mockRestore()
        cancelSyncSpy.mockRestore()
    })

    test('clientsResetsRetryCountAfterSyncSuccess', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const done = makeDonePromise()

        let syncOpCount = 0

        const generator = createMockSyncGenerator(
            () => syncOpCount > 2 && syncOpCount < 4,
            () => syncOpCount++,
        )
        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: PartialMessage<SyncStreamsRequest>,
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

        await expect(done.expectToSucceed()).toResolve()
        const cancelSyncSpy = jest
            .spyOn(alicesClient.rpcClient, 'cancelSync')
            .mockImplementation(
                (
                    request: PartialMessage<CancelSyncRequest>,
                    _options?: CallOptions,
                ): Promise<CancelSyncResponse> => {
                    log('mocked cancelSync', request)
                    generator.setSyncCancelled()
                    return Promise.resolve(new CancelSyncResponse({}))
                },
            )

        await alicesClient.stopSync()
        spy.mockRestore()
        cancelSyncSpy.mockRestore()
    })
    test('clientCreatesStreamsForNewUser', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        expect(bobsClient.streams.size()).toEqual(4)
        expect(bobsClient.streams.get(makeUserSettingsStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserInboxStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserDeviceKeyStreamId(bobsClient.userId))).toBeDefined()
    })

    test('clientCreatesStreamsForExistingUser', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        const bobsAnotherClient = await makeTestClient({ context: bobsClient.signerContext })
        await expect(bobsAnotherClient.initializeUser()).toResolve()
        expect(bobsAnotherClient.streams.size()).toEqual(4)
        expect(
            bobsAnotherClient.streams.get(makeUserSettingsStreamId(bobsClient.userId)),
        ).toBeDefined()
        expect(bobsAnotherClient.streams.get(makeUserStreamId(bobsClient.userId))).toBeDefined()
        expect(
            bobsAnotherClient.streams.get(makeUserDeviceKeyStreamId(bobsClient.userId)),
        ).toBeDefined()
    })

    test('bobCanSendMemberPayload', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
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

        // solicitation for isNewDevice should resolve
        payload = make_MemberPayload_KeySolicitation({
            deviceKey: 'foo',
            sessionIds: [],
            fallbackKey: 'baz',
            isNewDevice: true,
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).toResolve()

        // fulfillment should resolve
        payload = make_MemberPayload_KeyFulfillment({
            deviceKey: 'foo',
            userAddress: addressFromUserId(bobsClient.userId),
            sessionIds: [],
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).toResolve()

        await waitFor(() => {
            const lastEvent = bobsClient.streams
                .get(bobsClient.userSettingsStreamId!)
                ?.view.timeline.filter((x) => x.remoteEvent?.event.payload.case === 'memberPayload')
                .at(-1)
            expect(lastEvent).toBeDefined()
            check(lastEvent?.remoteEvent?.event.payload.case === 'memberPayload', '??')
            check(
                lastEvent?.remoteEvent?.event.payload.value.content.case === 'keyFulfillment',
                '??',
            )
            expect(lastEvent?.remoteEvent?.event.payload.value.content.value.deviceKey).toBe('foo')
        })

        // fulfillment with empty session ids should now fail
        payload = make_MemberPayload_KeyFulfillment({
            deviceKey: 'foo',
            userAddress: addressFromUserId(bobsClient.userId),
            sessionIds: [],
        })
        await expect(
            bobsClient.makeEventAndAddToStream(bobsClient.userSettingsStreamId!, payload),
        ).rejects.toThrow('DUPLICATE_EVENT')
    })

    test('bobCreatesUnamedSpaceAndStream', async () => {
        log('bobCreatesUnamedSpace')

        // Bob gets created, creates a space without providing an ID, and a channel without providing an ID.
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const spaceId = makeUniqueSpaceStreamId()
        const spacePromise = bobsClient.createSpace(spaceId)
        await expect(spacePromise).toResolve()
        const channelName = 'Bobs channel'
        const channelTopic = 'Bobs channel topic'
        const channelId = makeUniqueChannelStreamId(spaceId)
        await expect(
            bobsClient.createChannel(spaceId, channelName, channelTopic, channelId),
        ).toResolve()
        await expect(bobsClient.stopSync()).toResolve()
    })

    const bobCanReconnect = async (signer: SignerContext) => {
        const bobsAnotherClient = await makeTestClient({ context: signer, deviceId: 'd2' })
        const bobsOneMoreAnotherClient = await makeTestClient({ context: signer, deviceId: 'd3' })

        const eventDecryptedPromise = makeDonePromise()
        const streamInitializedPromise = makeDonePromise()

        let channelWithContentId: string | undefined

        const onEventDecrypted = (
            streamId: string,
            contentKind: SnapshotCaseType,
            event: DecryptedTimelineEvent,
        ): void => {
            try {
                log(event)
                const clearEvent = event.decryptedContent
                check(clearEvent.kind === 'channelMessage')
                if (
                    clearEvent?.content.payload?.case === 'post' &&
                    clearEvent?.content.payload?.value?.content?.case === 'text'
                ) {
                    expect(clearEvent?.content.payload?.value?.content.value?.body).toContain(
                        'Hello, again!',
                    )
                    expect(streamId).toBe(channelWithContentId)
                    //This done should be inside of the if statement to be sure that check happened.
                    eventDecryptedPromise.done()
                }
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
                    log(channel.view)
                    channel.view.timeline.forEach((x) => {
                        log('@@@', {
                            c1: x.remoteEvent?.event.payload.case,
                            v1: x.remoteEvent?.event.payload.value,
                            c2: x.remoteEvent?.event.payload.value?.content.case,
                            b2: x.remoteEvent?.event.payload.value?.content.value,
                        })
                    })
                    const messages = channel.view.timeline.filter(
                        (x) =>
                            x.remoteEvent?.event.payload.case === 'channelPayload' &&
                            x.remoteEvent?.event.payload.value.content.case === 'message',
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
        await expect(bobsAnotherClient.initializeUser()).toResolve()
        bobsAnotherClient.startSync()

        bobsOneMoreAnotherClient.on('eventDecrypted', onEventDecrypted)
        await expect(bobsOneMoreAnotherClient.initializeUser()).toResolve()
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
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()

        // Bob can send a message.
        const stream = await bobsClient.waitForStream(bobsChannelId)

        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!')).toResolve()
        await waitFor(() => {
            const event = stream.view.timeline.find(
                (e) =>
                    getChannelMessagePayload(e.localEvent?.channelMessage) ===
                    'Hello, world from Bob!',
            )
            expect(event).toBeDefined()
            expect(event?.remoteEvent).toBeDefined()
        })

        log('bobSendsSingleMessage done')
    })

    test('bobAndAliceConverse', async () => {
        log('bobAndAliceConverse')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // Alice gest created.
        await expect(alicesClient.initializeUser()).toResolve()
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
                    await expect(alicesClient.joinStream(streamId)).toResolve()
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
            (
                streamId: string,
                contentKind: SnapshotCaseType,
                event: DecryptedTimelineEvent,
            ): void => {
                const channelId = streamId
                const content = event.decryptedContent.content
                expect(content).toBeDefined()
                log('eventDecrypted', 'Alice', channelId)
                void (async () => {
                    try {
                        expect(channelId).toBe(bobsChannelId)
                        const clearEvent = event.decryptedContent
                        check(clearEvent.kind === 'channelMessage')
                        if (
                            clearEvent.content.payload?.case === 'post' &&
                            clearEvent.content.payload?.value?.content?.case === 'text'
                        ) {
                            const body = clearEvent.content.payload?.value?.content.value?.body
                            // @ts-ignore
                            expect(body).toBeOneOf(conversation)
                            if (body === 'Hello, Alice!') {
                                await alicesClient.sendMessage(channelId, 'Hello, Bob!')
                            } else if (body === 'Weather nice?') {
                                await alicesClient.sendMessage(channelId, 'Sun and rain!')
                            } else if (body === 'Coffee or tea?') {
                                await alicesClient.sendMessage(channelId, 'Both!')
                                aliceGetsMessage.done()
                            }
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
            (
                streamId: string,
                contentKind: SnapshotCaseType,
                event: DecryptedTimelineEvent,
            ): void => {
                const channelId = streamId
                const content = event.decryptedContent.content
                expect(content).toBeDefined()
                log('eventDecrypted', 'Bob', channelId)

                void (async () => {
                    try {
                        expect(channelId).toBe(bobsChannelId)
                        const clearEvent = event.decryptedContent
                        check(clearEvent.kind === 'channelMessage')
                        if (
                            clearEvent.content?.payload?.case === 'post' &&
                            clearEvent.content?.payload?.value?.content?.case === 'text'
                        ) {
                            const body = clearEvent.content?.payload?.value?.content.value?.body
                            // @ts-ignore
                            expect(body).toBeOneOf(conversation)
                            if (body === 'Hello, Bob!') {
                                await bobsClient.sendMessage(channelId, 'Weather nice?')
                            } else if (body === 'Sun and rain!') {
                                await bobsClient.sendMessage(channelId, 'Coffee or tea?')
                            } else if (body === 'Both!') {
                                bobGetsMessage.done()
                            }
                        }
                    } catch (e) {
                        log('streamInitialized error', e)
                        bobGetsMessage.reject(e)
                    }
                })()
            },
        )

        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!')).toResolve()
        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, Alice!')).toResolve()

        log('Waiting for Alice to get messages...')
        await aliceGetsMessage.expectToSucceed()
        log('Waiting for Bob to get messages...')
        await bobGetsMessage.expectToSucceed()
        log('bobAndAliceConverse All done!')
    })

    test('bobUploadsDeviceKeys', async () => {
        log('bobUploadsDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfInbox = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, userDevice: UserDevice): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, userDevice)
                bobSelfInbox.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(userDevice.deviceKey).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfInbox.expectToSucceed()
    })

    test('bobDownloadsOwnDeviceKeys', async () => {
        log('bobDownloadsOwnDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfInbox = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: UserDevice): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, deviceKeys)
                bobSelfInbox.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfInbox.expectToSucceed()
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([bobsUserId])
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesDeviceKeys', async () => {
        log('bobDownloadsAlicesDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        bobsClient.startSync()
        alicesClient.startSync()
        const alicesUserId = alicesClient.userId
        const alicesSelfInbox = makeDonePromise()
        alicesClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: UserDevice): void => {
                log('userDeviceKeyMessage for Alice', streamId, userId, deviceKeys)
                alicesSelfInbox.runAndDone(() => {
                    expect(streamId).toBe(aliceUserDeviceKeyStreamId)
                    expect(userId).toBe(alicesUserId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId])
        expect(deviceKeys[alicesUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnDeviceKeys', async () => {
        log('bobDownloadsAlicesAndOwnDeviceKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
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
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        const deviceKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId, bobsUserId])
        expect(Object.keys(deviceKeys).length).toEqual(2)
        expect(deviceKeys[alicesUserId]).toBeDefined()
        expect(deviceKeys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnFallbackKeys', async () => {
        log('bobDownloadsAlicesAndOwnFallbackKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys, including
        // fallback keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
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
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys.deviceKey).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        const fallbackKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId, bobsUserId])

        expect(fallbackKeys).toBeDefined()
        expect(Object.keys(fallbackKeys).length).toEqual(2)
    })

    test('bobDownloadsAlicesFallbackKeys', async () => {
        log('bobDownloadsAlicesFallbackKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys, including
        // fallback keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        bobsClient.startSync()
        alicesClient.startSync()
        await waitFor(() => {
            // @ts-ignore
            expect(alicesClient.decryptionExtensions?.status).toEqual(DecryptionStatus.idle)
        })
        const alicesUserId = alicesClient.userId

        const fallbackKeys = await bobsClient.downloadUserDeviceInfo([alicesUserId])
        expect(Object.keys(fallbackKeys)).toContain(alicesUserId)
        expect(Object.keys(fallbackKeys).length).toEqual(1)
        expect(fallbackKeys[alicesUserId].map((k) => k.fallbackKey)).toContain(
            Object.values(alicesClient.encryptionDevice.fallbackKey)[0],
        )
    })

    test('aliceLeavesChannelsWhenLeavingSpace', async () => {
        log('aliceLeavesChannelsWhenLeavingSpace')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        const bobsSpaceId = makeUniqueSpaceStreamId()
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeUniqueChannelStreamId(bobsSpaceId)
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // Alice gest created.
        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()

        await expect(alicesClient.joinStream(bobsSpaceId)).toResolve()
        await expect(alicesClient.joinStream(bobsChannelId)).toResolve()
        const channelStream = bobsClient.stream(bobsChannelId)
        expect(channelStream).toBeDefined()
        await waitFor(() => {
            expect(channelStream?.view.getMembers().membership.joinedUsers).toContain(
                alicesClient.userId,
            )
        })
        // leave the space
        await expect(alicesClient.leaveStream(bobsSpaceId)).toResolve()

        // the channel should be left as well
        await waitFor(() => {
            expect(channelStream?.view.getMembers().membership.joinedUsers).not.toContain(
                alicesClient.userId,
            )
        })
        await alicesClient.stopSync()
    })

    test('clientReturnsKnownDevicesForUserId', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()

        await expect(alicesClient.initializeUser()).toResolve()
        alicesClient.startSync()
        await waitFor(() => {
            // @ts-ignore
            expect(alicesClient.decryptionExtensions?.status).toEqual(DecryptionStatus.idle)
        })

        await expect(bobsClient.downloadUserDeviceInfo([alicesClient.userId])).toResolve()
        const knownDevices = await bobsClient.knownDevicesForUserId(alicesClient.userId)

        expect(knownDevices.length).toBe(1)
        expect(knownDevices[0].fallbackKey).toBe(
            Object.values(alicesClient.encryptionDevice.fallbackKey)[0],
        )
    })

    // Make sure that the client only uploads device keys
    // if this exact device key does not exist.
    test('clientOnlyUploadsDeviceKeysOnce', async () => {
        await expect(await bobsClient.initializeUser()).toResolve()
        bobsClient.startSync()
        const stream = bobsClient.stream(bobsClient.userDeviceKeyStreamId!)!

        const waitForInitialUpload = makeDonePromise()
        stream.on('userDeviceKeyMessage', () => {
            waitForInitialUpload.done()
        })
        await waitForInitialUpload.expectToSucceed()

        for (let i = 0; i < 5; i++) {
            await bobsClient.uploadDeviceKeys()
        }

        const keys = stream.view.userDeviceKeyContent.deviceKeys
        expect(keys).toHaveLength(1)
    })
})
