import { dlog } from './dlog'
import { Client, IDownloadKeyResponse } from './client'
import {
    genId,
    makeChannelStreamId,
    makeSpaceStreamId,
    makeUserStreamId,
    makeUserSettingsStreamId,
    makeUserDeviceKeyStreamId,
} from './id'
import { IFallbackKey } from './types'
import { makeDonePromise, makeTestClient, waitFor } from './util.test'
import {
    ChannelMessage,
    DeviceKeys,
    SnapshotCaseType,
    SyncStreamsRequest,
    SyncStreamsResponse,
} from '@river/proto'
import { PartialMessage } from '@bufbuild/protobuf'
import { CallOptions } from '@connectrpc/connect'
// This is needed to get the jest itnerface for using in spyOn
// eslint-disable-next-line import/no-extraneous-dependencies
import { jest } from '@jest/globals'
import { RiverEventV2 } from './eventV2'
import { SignerContext } from './sign'

const log = dlog('csb:test')

function makeMockSyncResponses(count: number) {
    const obj = {
        [Symbol.asyncIterator]:
            async function* asyncGenerator(): AsyncGenerator<SyncStreamsResponse> {
                const responses = []
                for (let i = 0; i < count; i++) {
                    responses.push(
                        Promise.resolve(new SyncStreamsResponse({ stream: { events: [] } })),
                    )
                }
                while (responses.length) {
                    yield await responses.shift()!
                }
            },
    }
    return obj
}

function getChannelMessagePayload(event?: ChannelMessage) {
    if (event?.payload?.case === 'post') {
        if (event.payload.value.content.case === 'text') {
            return event.payload.value.content.value?.body
        }
    }
    return undefined
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
        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        const channelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()
        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, channelId),
        ).toResolve()

        const stream = await bobsClient.waitForStream(channelId)
        bobsClient.sendMessage(channelId, 'Hello, world!')

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

    test('clientsCanBeClosedNoSync', async () => {})

    test('clientsNotifiedOnSyncFailure', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const done = makeDonePromise()

        const testError = new Error('test error')

        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (_request: PartialMessage<SyncStreamsRequest>, _options?: CallOptions) => {
                    log('syncStreams')
                    throw testError
                },
            )

        await alicesClient.startSync({
            onFailure: (err) => {
                expect(err).toBe(testError)
                done.done()
            },
        })

        await expect(done.expectToSucceed()).toResolve()
        const syncError = await alicesClient.stopSync()
        expect(syncError).toBe(testError)
        spy.mockRestore()
    })

    test('clientsRetryOnSyncError', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const done = makeDonePromise()

        let failureCount = 0
        const testError = new TypeError('fetch failed')
        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: PartialMessage<SyncStreamsRequest>,
                    _options?: CallOptions,
                ): AsyncIterable<SyncStreamsResponse> => {
                    if (failureCount++ < 3) {
                        throw testError
                    } else {
                        done.done()
                        spy.mockRestore()
                        return makeMockSyncResponses(2)
                    }
                },
            )

        await alicesClient.startSync()

        await expect(done.expectToSucceed()).toResolve()
        const syncError = await alicesClient.stopSync()
        expect(syncError).toBe(undefined)
    })

    test('clientsGivesUpAfter5SyncError', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const done = makeDonePromise()

        let failureCount = 0
        const testError = new TypeError('fetch failed')
        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: PartialMessage<SyncStreamsRequest>,
                    _options?: CallOptions,
                ): AsyncIterable<SyncStreamsResponse> => {
                    if (failureCount++ < 5) {
                        throw testError
                    } else {
                        done.done()
                        throw testError
                    }
                },
            )

        await alicesClient.startSync()

        await expect(done.expectToSucceed()).toResolve()
        const syncError = await alicesClient.stopSync()
        expect(syncError).toBe(testError)
        spy.mockRestore()
    })

    test('clientsResetsRetryCountAfterSyncSuccess', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const done = makeDonePromise()

        let failureCount = 0
        const testError = new TypeError('fetch failed')
        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (
                    _request: PartialMessage<SyncStreamsRequest>,
                    _options?: CallOptions,
                ): AsyncIterable<SyncStreamsResponse> => {
                    if (failureCount++ < 4 || (failureCount > 6 && failureCount < 9)) {
                        throw testError
                    } else if (failureCount === 5) {
                        return makeMockSyncResponses(0)
                    } else {
                        done.done()
                        spy.mockRestore()
                        return makeMockSyncResponses(0)
                    }
                },
            )

        await alicesClient.startSync()

        await expect(done.expectToSucceed()).toResolve()
        const syncError = await alicesClient.stopSync()
        expect(syncError).toBe(undefined)
    })

    test('clientsCanBeStoppedDuringErrorRetry', async () => {
        await expect(alicesClient.initializeUser()).toResolve()
        const testError = new Error('test error')
        const done = makeDonePromise()

        const spy = jest
            .spyOn(alicesClient.rpcClient, 'syncStreams')
            .mockImplementation(
                (_request: PartialMessage<SyncStreamsRequest>, _options?: CallOptions) => {
                    done.done()
                    throw testError
                },
            )

        await alicesClient.startSync({
            onFailure: (_err) => {},
        })

        await expect(done.expectToSucceed()).toResolve()
        const syncError = await alicesClient.stopSync()
        expect(syncError).toBe(undefined)
        spy.mockRestore()
    })

    test('clientsCanBeClosedAfterSync', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
    })

    test('clientCreatesStreamsForNewUser', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        expect(bobsClient.streams.size).toEqual(3)
        expect(bobsClient.streams.get(makeUserSettingsStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserStreamId(bobsClient.userId))).toBeDefined()
        expect(bobsClient.streams.get(makeUserDeviceKeyStreamId(bobsClient.userId))).toBeDefined()
    })

    test('clientCreatesStreamsForExistingUser', async () => {
        await expect(bobsClient.initializeUser()).toResolve()
        const bobsAnotherClient = await makeTestClient(undefined, bobsClient.signerContext)
        await expect(bobsAnotherClient.initializeUser()).toResolve()
        expect(bobsAnotherClient.streams.size).toEqual(3)
        expect(
            bobsAnotherClient.streams.get(makeUserSettingsStreamId(bobsClient.userId)),
        ).toBeDefined()
        expect(bobsAnotherClient.streams.get(makeUserStreamId(bobsClient.userId))).toBeDefined()
        expect(
            bobsAnotherClient.streams.get(makeUserDeviceKeyStreamId(bobsClient.userId)),
        ).toBeDefined()
    })

    test('bobCreatesUnamedSpaceAndStream', async () => {
        log('bobCreatesUnamedSpace')

        // Bob gets created, creates a space without providing an ID, and a channel without providing an ID.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()

        const spaceId = bobsClient.createSpace(undefined)
        await expect(spaceId).toResolve()
        const { streamId } = await spaceId
        const channelName = 'Bobs channel'
        const channelTopic = 'Bobs channel topic'
        await expect(bobsClient.createChannel(streamId, channelName, channelTopic)).toResolve()
        await expect(bobsClient.stopSync()).toResolve()
    })

    const bobCanReconnect = async (signer: SignerContext) => {
        const bobsAnotherClient = await makeTestClient(undefined, signer)

        const done = makeDonePromise()

        const onChannelNewMessage = (channelId: string, event: RiverEventV2): void => {
            log('onChannelNewMessage', channelId)
            log(event)

            done.runAndDoneAsync(async () => {
                const content = event.getWireContent()
                expect(content).toBeDefined()
                await bobsAnotherClient.decryptEventIfNeeded(event)
                const clearEvent = event.getContent()
                if (
                    clearEvent?.content?.payload?.case === 'post' &&
                    clearEvent?.content?.payload?.value?.content?.case === 'text'
                ) {
                    expect(clearEvent?.content?.payload?.value?.content.value?.body).toContain(
                        'Hello, again!',
                    )
                }
            })
        }

        let channelWithContentId: string | undefined
        const onStreamInitialized = (streamId: string, streamKind: SnapshotCaseType) => {
            log('streamInitialized', streamId, streamKind)
            done.runAndDoneAsync(async () => {
                if (streamKind === 'channelContent') {
                    const channel = bobsAnotherClient.stream(streamId)!
                    log('channel content')
                    log(channel.view)
                    const messages = Array.from(
                        channel.view.channelContent.messages.state.values() ?? [],
                    )
                    expect(messages).toHaveLength(1)
                    channel.on('channelNewMessage', onChannelNewMessage)
                    channelWithContentId = streamId
                }
            })
        }
        bobsAnotherClient.on('streamInitialized', onStreamInitialized)

        await expect(bobsAnotherClient.initializeUser()).toResolve()
        await bobsAnotherClient.startSync()
        expect(channelWithContentId).toBeDefined()
        bobsAnotherClient.sendMessage(channelWithContentId!, 'Hello, again!')

        await done.expectToSucceed()

        await bobsAnotherClient.stopSync()

        return 'done'
    }

    test('bobSendsSingleMessage', async () => {
        log('bobSendsSingleMessage')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

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
        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // Alice gest created.
        await expect(alicesClient.initializeUser()).toResolve()
        await alicesClient.startSync()

        await expect(bobsClient.sendMessage(bobsChannelId, 'Hello, world from Bob!')).toResolve()

        // Alice can't sent a message to Bob's channel.
        // TODO: since Alice doesn't sync Bob's channel, this fails fast (i.e. stream is unknown to Alice's client).
        // It would be interesting for Alice to sync this channel, and then try to send a message.
        await expect(
            alicesClient.sendMessage(bobsChannelId, 'Hello, world from Alice!'),
        ).rejects.toThrow()

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

        alicesClient.on('eventDecrypted', (event: RiverEventV2, error?: Error): void => {
            if (error) {
                return
            }
            const channelId = event.getStreamId()
            const content = event.getWireContent()
            expect(content).toBeDefined()
            log('eventDecrypted', 'Alice', channelId)
            aliceGetsMessage.runAsync(async () => {
                expect(channelId).toBe(bobsChannelId)
                const clearEvent = event.getContent()
                expect(clearEvent?.content?.payload).toBeDefined()
                if (
                    clearEvent?.content?.payload?.case === 'post' &&
                    clearEvent?.content?.payload?.value?.content?.case === 'text'
                ) {
                    const body = clearEvent?.content?.payload?.value?.content.value?.body
                    // @ts-ignore
                    expect(body).toBeOneOf(conversation)
                    if (body === 'Hello, Alice!') {
                        alicesClient.sendMessage(channelId, 'Hello, Bob!')
                    } else if (body === 'Weather nice?') {
                        alicesClient.sendMessage(channelId, 'Sun and rain!')
                    } else if (body === 'Coffee or tea?') {
                        alicesClient.sendMessage(channelId, 'Both!')
                        aliceGetsMessage.done()
                    }
                }
            })
        })

        bobsClient.on('eventDecrypted', (event: RiverEventV2, error?: Error): void => {
            if (error) {
                return
            }
            const channelId = event.getStreamId()
            const content = event.getWireContent()
            expect(content).toBeDefined()
            log('eventDecrypted', 'Bob', channelId)
            bobGetsMessage.runAsync(async () => {
                expect(channelId).toBe(bobsChannelId)
                const clearEvent = event.getContent()
                expect(clearEvent?.content?.payload).toBeDefined()
                if (
                    clearEvent?.content?.payload?.case === 'post' &&
                    clearEvent?.content?.payload?.value?.content?.case === 'text'
                ) {
                    const body = clearEvent?.content?.payload?.value?.content.value?.body
                    // @ts-ignore
                    expect(body).toBeOneOf(conversation)
                    if (body === 'Hello, Bob!') {
                        bobsClient.sendMessage(channelId, 'Weather nice?')
                    } else if (body === 'Sun and rain!') {
                        bobsClient.sendMessage(channelId, 'Coffee or tea?')
                    } else if (body === 'Both!') {
                        bobGetsMessage.done()
                    }
                }
            })
        })

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
        await bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfToDevice = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfToDevice.expectToSucceed()
    })

    test('bobDownloadsOwnDeviceKeys', async () => {
        log('bobDownloadsOwnDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        const bobsUserId = bobsClient.userId
        const bobSelfToDevice = makeDonePromise()
        bobsClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage for Bob', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect(streamId).toBe(bobUserDeviceKeyStreamId)
                    expect(userId).toBe(bobsUserId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        await bobSelfToDevice.expectToSucceed()
        const deviceKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers({
            [bobsUserId]: {},
        })
        expect(deviceKeys.device_keys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesDeviceKeys', async () => {
        log('bobDownloadsAlicesDeviceKeys')
        // Bob gets created, starts syncing, and uploads his device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
        const alicesUserId = alicesClient.userId
        const alicesSelfToDevice = makeDonePromise()
        alicesClient.once(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage for Alice', streamId, userId, deviceKeys, fallbackKeys)
                alicesSelfToDevice.runAndDone(() => {
                    expect(streamId).toBe(aliceUserDeviceKeyStreamId)
                    expect(userId).toBe(alicesUserId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const deviceKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers({
            [alicesUserId]: {},
        })
        expect(deviceKeys.device_keys[alicesUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnDeviceKeys', async () => {
        log('bobDownloadsAlicesAndOwnDeviceKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfToDevice = makeDonePromise()
        // bobs client should sync userDeviceKeyMessage twice (once for alice, once for bob)
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        const deviceKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers({
            [alicesUserId]: {},
            [bobsUserId]: {},
        })
        expect(Object.keys(deviceKeys.device_keys).length).toEqual(2)
        expect(deviceKeys.device_keys[alicesUserId]).toBeDefined()
        expect(deviceKeys.device_keys[bobsUserId]).toBeDefined()
    })

    test('bobDownloadsAlicesAndOwnFallbackKeys', async () => {
        log('bobDownloadsAlicesAndOwnFallbackKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys, including
        // fallback keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
        const bobsUserId = bobsClient.userId
        const alicesUserId = alicesClient.userId
        const bobSelfToDevice = makeDonePromise()
        // bobs client should sync userDeviceKeyMessage twice (once for alice, once for bob)
        bobsClient.on(
            'userDeviceKeyMessage',
            (streamId: string, userId: string, deviceKeys: DeviceKeys, fallbackKeys): void => {
                log('userDeviceKeyMessage', streamId, userId, deviceKeys, fallbackKeys)
                bobSelfToDevice.runAndDone(() => {
                    expect([bobUserDeviceKeyStreamId, aliceUserDeviceKeyStreamId]).toContain(
                        streamId,
                    )
                    expect([bobsUserId, alicesUserId]).toContain(userId)
                    expect(deviceKeys?.deviceId).toBeDefined()
                })
            },
        )
        const aliceUserDeviceKeyStreamId = alicesClient.userDeviceKeyStreamId
        const bobUserDeviceKeyStreamId = bobsClient.userDeviceKeyStreamId
        const fallbackKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers(
            {
                [alicesUserId]: {},
                [bobsUserId]: {},
            },
            true,
        )
        expect(fallbackKeys.fallback_keys).toBeDefined()
        expect(Object.keys(fallbackKeys.fallback_keys ?? {}).length).toEqual(2)
    })

    test('bobDownloadsAlicesFallbackKeys', async () => {
        log('bobDownloadsAlicesFallbackKeys')
        // Bob, Alice get created, starts syncing, and uploads respective device keys, including
        // fallback keys.
        await expect(bobsClient.initializeUser()).toResolve()
        await expect(alicesClient.initializeUser()).toResolve()
        await bobsClient.startSync()
        await alicesClient.startSync()
        const alicesUserId = alicesClient.userId
        expect(alicesClient.deviceId).toBeDefined()
        const aliceFallbackKeys: Record<string, IFallbackKey> = {
            [alicesClient.deviceId as string]: {
                key: 'alice-fallback-key',
                signatures: {
                    [`curve25519: ${alicesClient.deviceId}`]: 'alice-fallback-key-signature',
                },
            },
        }
        await alicesClient.uploadKeysRequest({
            user_id: alicesClient.userId,
            device_id: alicesClient.deviceId as string,
            fallback_keys: aliceFallbackKeys,
        })

        const fallbackKeys: IDownloadKeyResponse = await bobsClient.downloadKeysForUsers(
            {
                [alicesUserId]: {},
            },
            true,
        )

        expect(fallbackKeys.fallback_keys).toBeDefined()
        expect(Object.keys(fallbackKeys.fallback_keys ?? {})).toContain(alicesUserId)
        expect(Object.keys(fallbackKeys.fallback_keys ?? {}).length).toEqual(1)
        if (fallbackKeys.fallback_keys) {
            const keys: string[] = []
            Object.values(fallbackKeys.fallback_keys[alicesUserId]).map((value) => {
                Object.keys(value).map((keyId) => {
                    const key = Object.values(value[keyId].algoKeyId)[0].key
                    if (key) {
                        keys.push(key)
                    }
                })
            })
            expect(keys).toContain('alice-fallback-key')
        }
    })

    test('aliceLeavesChannelsWhenLeavingSpace', async () => {
        log('aliceLeavesChannelsWhenLeavingSpace')

        // Bob gets created, creates a space, and creates a channel.
        await expect(bobsClient.initializeUser()).toResolve()
        await bobsClient.startSync()

        const bobsSpaceId = makeSpaceStreamId('bobs-space-' + genId())
        await expect(bobsClient.createSpace(bobsSpaceId)).toResolve()

        const bobsChannelId = makeChannelStreamId('bobs-channel-' + genId())
        const bobsChannelName = 'Bobs channel'
        const bobsChannelTopic = 'Bobs channel topic'

        await expect(
            bobsClient.createChannel(bobsSpaceId, bobsChannelName, bobsChannelTopic, bobsChannelId),
        ).toResolve()
        await expect(bobsClient.waitForStream(bobsChannelId)).toResolve()

        // Alice gest created.
        await expect(alicesClient.initializeUser()).toResolve()
        await alicesClient.startSync()

        await expect(alicesClient.joinStream(bobsSpaceId)).toResolve()
        await expect(alicesClient.joinStream(bobsChannelId)).toResolve()
        const channelStream = bobsClient.stream(bobsChannelId)
        expect(channelStream).toBeDefined()
        await waitFor(() => {
            expect(channelStream?.view.getMemberships().joinedUsers).toContain(alicesClient.userId)
        })
        // leave the space
        await expect(alicesClient.leaveStream(bobsSpaceId)).toResolve()

        // the channel should be left as well
        await waitFor(() => {
            expect(channelStream?.view.getMemberships().joinedUsers).not.toContain(
                alicesClient.userId,
            )
        })
        await alicesClient.stopSync()
    })
})
