import {
    CryptoStore,
    GroupEncryptionAlgorithmId,
    GroupEncryptionCrypto,
    GroupEncryptionSession,
    parseGroupEncryptionAlgorithmId,
    UserDevice,
    type EncryptionDeviceInitOpts,
    type IGroupEncryptionClient,
} from '@towns-protocol/encryption'
import { makeStreamRpcClient, type StreamRpcClient } from './makeStreamRpcClient'
import {
    makeSignerContext,
    makeSignerContextFromBearerToken,
    type SignerContext,
} from './signerContext'
import { townsEnv, TownsService, type TownsConfig } from './townsEnv'
import { ethers } from 'ethers'
import { RiverRegistry, type Address } from '@towns-protocol/web3'
import { makeSessionKeys } from './decryptionExtensions'
import { makeBaseProvider, makeRiverProvider } from './sync-agent/utils/providers'
import { RiverDbManager } from './riverDbManager'
import {
    makeUserInboxStreamId,
    makeUserMetadataStreamId,
    streamIdAsBytes,
    streamIdAsString,
    userIdFromAddress,
} from './id'
import {
    make_UserInboxPayload_GroupEncryptionSessions,
    type ParsedEvent,
    type MiniblockInfoResponse,
} from './types'
import {
    makeEvent,
    unpackStream,
    unpackEnvelope as sdk_unpackEnvelope,
    unpackEnvelopes as sdk_unpackEnvelopes,
    UnpackEnvelopeOpts,
} from './sign'
import { bin_toHexString, bin_fromHexString, check } from '@towns-protocol/utils'
import { fromJsonString, toJsonString } from '@bufbuild/protobuf'
import {
    SessionKeysSchema,
    UserInboxPayload_GroupEncryptionSessions,
    Err,
    type Envelope,
    type PlainMessage,
    type StreamEvent,
    type Tags,
} from '@towns-protocol/proto'
import { errorContains, errorContainsMessage, getRpcErrorProperty } from './rpcInterceptors'
import { AppRegistryService } from './appRegistryService'
import { AppRegistryRpcClient } from './makeAppRegistryRpcClient'
import { StreamStateView } from './streamStateView'

type Client_Base = {
    /** The userId of the Client. */
    userId: Address
    /** The signer context of the Client. */
    signerContext: SignerContext
    /** The wallet of the Client. */
    wallet: ethers.Wallet
    /** RPC client that connects to the Towns network. */
    rpc: StreamRpcClient
    /** The config of the Client. Stores environenment id, base and river chain config */
    config: TownsConfig
    /** Crypto Store */
    keychain: CryptoStore
    /** Crypto Backend */
    crypto: GroupEncryptionCrypto
    /** Algorithm used for group encryption. */
    defaultGroupEncryptionAlgorithm: GroupEncryptionAlgorithmId
    /** Disable hash validation for streams. */
    disableHashValidation: boolean
    /** Disable signature validation for streams. */
    disableSignatureValidation: boolean
    /** Options for unpacking envelopes */
    unpackEnvelopeOpts: UnpackEnvelopeOpts
    /** Get the app service, will authenticate on first call and cache the service for subsequent calls */
    appServiceClient: () => Promise<AppRegistryRpcClient>
    /** Get a stream by streamId and unpack it */
    getStream: (streamId: string) => Promise<StreamStateView>
    /** Get the miniblock info for a stream */
    getMiniblockInfo: (streamId: string) => Promise<MiniblockInfoResponse>
    /** Unpack envelope using client config */
    unpackEnvelope: (envelope: Envelope) => Promise<ParsedEvent>
    /** Unpack envelopes using client config */
    unpackEnvelopes: (envelopes: Envelope[]) => Promise<ParsedEvent[]>
    /** injest a group encryption session */
    importGroupEncryptionSessions: (payload: {
        streamId: string
        sessions: UserInboxPayload_GroupEncryptionSessions
    }) => Promise<void>
    /** Send an event to a stream */
    sendEvent: (
        streamId: string,
        eventPayload: PlainMessage<StreamEvent>['payload'],
        tags?: PlainMessage<Tags>,
        ephemeral?: boolean,
    ) => Promise<{ eventId: string; prevMiniblockHash: Uint8Array; envelope: Envelope }>
}

// Main idea behind this is to allow for extension of the client.
// This way we can define multiple API, toggle sync/persistence and have better upgrade plans.
// TODO: better naming :)
export type ClientV2<extended extends Extended | undefined = Extended | undefined> = Client_Base &
    (extended extends Extended ? extended : unknown) & {
        extend: <const client extends Extended>(
            fn: (client: ClientV2<extended>) => client,
        ) => ClientV2<Prettify<client> & (extended extends Extended ? extended : unknown)>
    }

type Extended = Prettify<
    // disallow redefining base properties
    { [_ in keyof Client_Base]?: undefined } & {
        [key: string]: unknown
    }
>

export type Prettify<T> = {
    [K in keyof T]: T[K]
} & {}

export type CreateTownsClientParams = {
    env: string
    encryptionDevice?: EncryptionDeviceInitOpts
    /** Toggle hash validation of Envelopes. Defaults to `false`. */
    hashValidation?: boolean
    /** Toggle signature validation of Envelopes. Defaults to `false`. */
    signatureValidation?: boolean
}
export const createTownsClient = async (
    params: (
        | {
              privateKey: string
          }
        | {
              mnemonic: string
          }
        | {
              bearerToken: string
          }
    ) &
        CreateTownsClientParams,
): Promise<ClientV2> => {
    const config = townsEnv().makeTownsConfig(params.env)
    const baseProvider = makeBaseProvider(config)

    let signerContext: SignerContext
    let wallet: ethers.Wallet | undefined
    if ('mnemonic' in params) {
        wallet = ethers.Wallet.fromMnemonic(params.mnemonic).connect(baseProvider)
        const delegateWallet = ethers.Wallet.createRandom()
        signerContext = await makeSignerContext(wallet, delegateWallet)
    } else if ('privateKey' in params) {
        wallet = new ethers.Wallet(params.privateKey).connect(baseProvider)
        const delegateWallet = ethers.Wallet.createRandom()
        signerContext = await makeSignerContext(wallet, delegateWallet)
    } else {
        signerContext = await makeSignerContextFromBearerToken(params.bearerToken)
        wallet = new ethers.Wallet(signerContext.signerPrivateKey()).connect(baseProvider)
    }

    const riverProvider = makeRiverProvider(config)
    const riverRegistryDapp = new RiverRegistry(config.river.chainConfig, riverProvider)
    const urls = await riverRegistryDapp.getOperationalNodeUrls()
    const rpc = makeStreamRpcClient(urls, () => riverRegistryDapp.getOperationalNodeUrls())

    const userId = userIdFromAddress(signerContext.creatorAddress)

    const cryptoStore = RiverDbManager.getCryptoDb(userId, undefined)
    await cryptoStore.initialize()

    // eslint-disable-next-line prefer-const
    let crypto: GroupEncryptionCrypto
    let _appService: Awaited<ReturnType<typeof AppRegistryService.authenticate>> | undefined

    const getMiniblockInfo = async (streamId: string): Promise<MiniblockInfoResponse> => {
        const r = await client.rpc.getLastMiniblockHash({ streamId: streamIdAsBytes(streamId) })
        return {
            miniblockNum: r.miniblockNum,
            miniblockHash: r.hash,
            encryptionAlgorithm: r.encryptionAlgorithm,
        }
    }

    const getStream = async (streamId: string): Promise<StreamStateView> => {
        const { disableHashValidation, disableSignatureValidation } = client
        const stream = await client.rpc.getStream({ streamId: streamIdAsBytes(streamId) })
        const unpackedResponse = await unpackStream(stream.stream, {
            disableHashValidation,
            disableSignatureValidation,
        })
        const streamView = new StreamStateView(userId, streamIdAsString(streamId), undefined)
        streamView.initialize(
            unpackedResponse.streamAndCookie.nextSyncCookie,
            unpackedResponse.streamAndCookie.events,
            unpackedResponse.snapshot,
            unpackedResponse.streamAndCookie.miniblocks,
            [],
            unpackedResponse.prevSnapshotMiniblockNum,
            undefined,
            [],
            undefined,
        )
        return streamView
    }

    const unpackEnvelope = async (envelope: Envelope): Promise<ParsedEvent> => {
        const { disableHashValidation, disableSignatureValidation } = client
        return sdk_unpackEnvelope(envelope, {
            disableHashValidation,
            disableSignatureValidation,
        })
    }

    const unpackEnvelopes = async (envelopes: Envelope[]): Promise<ParsedEvent[]> => {
        const { disableHashValidation, disableSignatureValidation } = client
        return sdk_unpackEnvelopes(envelopes, { disableHashValidation, disableSignatureValidation })
    }

    const withRetry = async <T>(
        operation: (
            prev: { prevMiniblockHash: Uint8Array; prevMiniblockNum: bigint } | undefined,
            retryCount: number,
        ) => Promise<T>,
    ): Promise<T> => {
        const RETRY_POLICY: Partial<Record<Err, { delay: number | number[]; maxRetries: number }>> =
            {
                [Err.MINIBLOCK_TOO_NEW]: { delay: 1000, maxRetries: Infinity },
                [Err.BAD_PREV_MINIBLOCK_HASH]: { delay: 0, maxRetries: 3 },
                [Err.PERMISSION_DENIED]: { delay: [200, 400, 800, 1100], maxRetries: 4 },
            }
        const attempt = async (
            retryCount: number,
            prev?: { prevMiniblockHash: Uint8Array; prevMiniblockNum: bigint },
        ): Promise<T> => {
            try {
                return await operation(prev, retryCount)
            } catch (err) {
                let policy: { delay: number | number[]; maxRetries: number } | undefined
                let errorType: Err | undefined

                if (errorContains(err, Err.MINIBLOCK_TOO_NEW)) {
                    policy = RETRY_POLICY[Err.MINIBLOCK_TOO_NEW]
                    errorType = Err.MINIBLOCK_TOO_NEW
                } else if (errorContains(err, Err.BAD_PREV_MINIBLOCK_HASH)) {
                    policy = RETRY_POLICY[Err.BAD_PREV_MINIBLOCK_HASH]
                    errorType = Err.BAD_PREV_MINIBLOCK_HASH
                } else if (
                    errorContains(err, Err.PERMISSION_DENIED) &&
                    (errorContainsMessage(err, 'Transaction has 0 confirmations.') ||
                        errorContainsMessage(err, 'Transaction receipt not found'))
                ) {
                    policy = RETRY_POLICY[Err.PERMISSION_DENIED]
                    errorType = Err.PERMISSION_DENIED
                }
                // Not a retryable error or max retries exceeded
                if (!policy || !errorType || retryCount >= policy.maxRetries) {
                    throw err
                }
                // Calculate delay for this retry
                const delay =
                    typeof policy.delay === 'number'
                        ? policy.delay
                        : policy.delay[retryCount] || policy.delay[policy.delay.length - 1]
                // Handle BAD_PREV_MINIBLOCK_HASH - extract expected hash from error
                if (errorType === Err.BAD_PREV_MINIBLOCK_HASH) {
                    const expectedHash = getRpcErrorProperty(err, 'expected')
                    const expectedMiniblockNum = getRpcErrorProperty(err, 'expNum')
                    check(
                        expectedHash !== undefined,
                        'expected hash not found in BAD_PREV_MINIBLOCK_HASH error',
                    )
                    check(
                        expectedMiniblockNum !== undefined,
                        'expected miniblock num not found in BAD_PREV_MINIBLOCK_HASH error',
                    )
                    if (delay > 0) {
                        await new Promise((resolve) => setTimeout(resolve, delay))
                    }
                    return attempt(retryCount + 1, {
                        prevMiniblockHash: bin_fromHexString(expectedHash),
                        prevMiniblockNum: BigInt(expectedMiniblockNum),
                    })
                }
                if (delay > 0) {
                    await new Promise((resolve) => setTimeout(resolve, delay))
                }
                return attempt(retryCount + 1, prev)
            }
        }
        return attempt(0)
    }

    const sendEvent = async (
        streamId: string,
        eventPayload: PlainMessage<StreamEvent>['payload'],
        tags?: PlainMessage<Tags>,
        ephemeral?: boolean,
    ): Promise<{ eventId: string; prevMiniblockHash: Uint8Array; envelope: Envelope }> => {
        return withRetry(async (prev, _retryCount) => {
            const { hash: miniblockHash, miniblockNum } = prev
                ? { hash: prev.prevMiniblockHash, miniblockNum: prev.prevMiniblockNum }
                : await client.rpc.getLastMiniblockHash({
                      streamId: streamIdAsBytes(streamId),
                  })
            const envelope = await makeEvent(
                signerContext,
                eventPayload,
                miniblockHash,
                miniblockNum,
                tags,
                ephemeral,
            )
            const eventId = bin_toHexString(envelope.hash)
            await client.rpc.addEvent({
                streamId: streamIdAsBytes(streamId),
                event: envelope,
            })
            return { eventId, prevMiniblockHash: miniblockHash, envelope }
        })
    }

    const buildGroupEncryptionClient = (): IGroupEncryptionClient => {
        const _downloadUserDeviceInfo = async (userId: string) => {
            const streamId = makeUserMetadataStreamId(userId)
            try {
                const deviceLookback = 10
                const streamView = await getStream(streamId)
                const userDevices = streamView.userMetadataContent.deviceKeys.slice(-deviceLookback)
                return { userId, devices: userDevices }
            } catch (e) {
                return { userId, devices: [] }
            }
        }

        const _encryptAndShareGroupSessionsToUser = async (
            streamId: string,
            userId: string,
            sessionIds: string[],
            payloadStr: string,
            algorithm: GroupEncryptionAlgorithmId,
            userDevice: UserDevice,
        ) => {
            try {
                const deviceKeys = await _downloadUserDeviceInfo(userId)
                const ciphertext = await crypto.encryptWithDeviceKeys(
                    payloadStr,
                    deviceKeys.devices,
                )
                if (Object.keys(ciphertext).length === 0) {
                    return
                }
                const toStreamId: string = makeUserInboxStreamId(userId)
                const { hash: miniblockHash, miniblockNum } = await rpc.getLastMiniblockHash({
                    streamId: streamIdAsBytes(toStreamId),
                })
                const event = await makeEvent(
                    signerContext,
                    make_UserInboxPayload_GroupEncryptionSessions({
                        streamId: streamIdAsBytes(streamId),
                        senderKey: userDevice.deviceKey,
                        sessionIds: sessionIds,
                        ciphertexts: ciphertext,
                        algorithm: algorithm,
                    }),
                    miniblockHash,
                    miniblockNum,
                )
                const eventId = bin_toHexString(event.hash)
                await rpc.addEvent({
                    streamId: streamIdAsBytes(toStreamId),
                    event,
                })
                return { miniblockHash, eventId }
            } catch (e) {
                return undefined
            }
        }

        const encryptAndShareGroupSessionsToStream: IGroupEncryptionClient['encryptAndShareGroupSessionsToStream'] =
            async (streamId, sessions, algorithm, priorityUserIds) => {
                const streamView = await getStream(streamId)
                const otherUsers = Array.from(streamView.getUsersEntitledToKeyExchange()).filter(
                    (userId) => !priorityUserIds.includes(userId),
                )
                check(sessions.length >= 0, 'no sessions to encrypt')
                check(
                    new Set(sessions.map((s) => s.streamId)).size === 1,
                    'sessions should all be from the same stream',
                )
                check(sessions[0].algorithm === algorithm, 'algorithm mismatch')
                check(
                    new Set(sessions.map((s) => s.algorithm)).size === 1,
                    'all sessions should be the same algorithm',
                )
                check(sessions[0].streamId === streamId, 'streamId mismatch')

                const userDevice = crypto.getUserDevice()
                const sessionIds = sessions.map((session) => session.sessionId)
                const payload = makeSessionKeys(sessions)
                const payloadStr = toJsonString(SessionKeysSchema, payload)
                // do the priority users first
                const priorityPromises = priorityUserIds.map(async (userId) => {
                    return _encryptAndShareGroupSessionsToUser(
                        streamId,
                        userId,
                        sessionIds,
                        payloadStr,
                        algorithm,
                        userDevice,
                    )
                })
                await Promise.all(priorityPromises)
                // then the other users
                const otherPromises = otherUsers.map(async (userId) => {
                    return _encryptAndShareGroupSessionsToUser(
                        streamId,
                        userId,
                        sessionIds,
                        payloadStr,
                        algorithm,
                        userDevice,
                    )
                })
                await Promise.all(otherPromises)
            }

        return {
            getMiniblockInfo,
            encryptAndShareGroupSessionsToStream,
        }
    }

    const appServiceClient = async (): Promise<AppRegistryRpcClient> => {
        if (_appService) {
            return _appService.appRegistryRpcClient
        }
        const appServiceConfig = config.services.find((s) => s.id === TownsService.AppRegistry)
        if (!appServiceConfig) {
            throw new Error('App registry service not found')
        }
        if (!appServiceConfig.url) {
            throw new Error('App registry service url not found')
        }
        _appService = await AppRegistryService.authenticate(signerContext, appServiceConfig.url)
        return _appService.appRegistryRpcClient
    }

    const importGroupEncryptionSessions = async (payload: {
        streamId: string
        sessions: UserInboxPayload_GroupEncryptionSessions
    }) => {
        const userDevice = crypto.getUserDevice()
        const { streamId, sessions: session } = payload
        // check if this message is to our device
        const ciphertext = session.ciphertexts[userDevice.deviceKey]
        if (!ciphertext) {
            //log.debug('skipping, no session for our device')
            return
        }
        // check if it contains any keys we need, default to GroupEncryption if the algorithm is not set
        const parsed = parseGroupEncryptionAlgorithmId(
            session.algorithm,
            GroupEncryptionAlgorithmId.GroupEncryption,
        )
        if (parsed.kind === 'unrecognized') {
            // todo dispatch event to update the error message
            //this.log.error('skipping, invalid algorithm', session.algorithm)
            return
        }
        const algorithm: GroupEncryptionAlgorithmId = parsed.value

        // decrypt the message
        const cleartext = await crypto.decryptWithDeviceKey(ciphertext, session.senderKey)
        const sessionKeys = fromJsonString(SessionKeysSchema, cleartext)
        check(sessionKeys.keys.length === session.sessionIds.length, 'bad sessionKeys')
        // make group sessions
        const sessions = sessionKeys.keys.map(
            (key, i) =>
                ({
                    streamId: streamId,
                    sessionId: session.sessionIds[i],
                    sessionKey: key,
                    algorithm: algorithm,
                }) satisfies GroupEncryptionSession,
        )
        await crypto.importSessionKeys(streamId, sessions)
    }
    await cryptoStore.initialize()
    crypto = new GroupEncryptionCrypto(buildGroupEncryptionClient(), cryptoStore)
    await crypto.init(params.encryptionDevice)

    const { hashValidation = false, signatureValidation = false } = params
    const unpackEnvelopeOpts: UnpackEnvelopeOpts = {
        disableHashValidation: !hashValidation,
        disableSignatureValidation: !signatureValidation,
    }
    const client = {
        crypto,
        keychain: cryptoStore,
        defaultGroupEncryptionAlgorithm: GroupEncryptionAlgorithmId.HybridGroupEncryption,
        rpc,
        signerContext,
        wallet,
        userId,
        disableHashValidation: !hashValidation,
        disableSignatureValidation: !signatureValidation,
        unpackEnvelopeOpts,
        appServiceClient,
        getStream,
        getMiniblockInfo,
        sendEvent,
        unpackEnvelope,
        unpackEnvelopes,
        importGroupEncryptionSessions,
        config,
    } satisfies Client_Base

    function extend(base: typeof client) {
        type ExtendFn = (base: typeof client) => unknown
        return (extendFn: ExtendFn) => {
            const extended = extendFn(base) as Extended
            for (const key in client) delete extended[key]
            const combined = { ...base, ...extended }
            return Object.assign(combined, { extend: extend(combined) })
        }
    }
    return Object.assign(client, { extend: extend(client) as any })
}
