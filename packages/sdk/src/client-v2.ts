import {
    CryptoStore,
    GroupEncryptionAlgorithmId,
    GroupEncryptionCrypto,
    type EncryptionDeviceInitOpts,
    type IGroupEncryptionClient,
    type UserDevice,
    type UserDeviceCollection,
} from '@towns-protocol/encryption'
import { makeStreamRpcClient, type StreamRpcClient } from './makeStreamRpcClient'
import {
    makeSignerContext,
    makeSignerContextFromBearerToken,
    type SignerContext,
} from './signerContext'
import { makeRiverConfig } from './riverConfig'
import { ethers } from 'ethers'
import { RiverRegistry } from '@towns-protocol/web3'
import { makeSessionKeys } from './decryptionExtensions'
import { makeRiverProvider } from './sync-agent/utils/providers'
import { RiverDbManager } from './riverDbManager'
import {
    makeUserInboxStreamId,
    makeUserMetadataStreamId,
    streamIdAsBytes,
    userIdFromAddress,
} from './id'
import {
    make_UserInboxPayload_GroupEncryptionSessions,
    type ParsedEvent,
    type ParsedStreamResponse,
} from './types'
import {
    makeEvent,
    unpackStream,
    unpackEnvelope as sdk_unpackEnvelope,
    unpackEnvelopes as sdk_unpackEnvelopes,
} from './sign'
import { bin_toHexString, check } from '@towns-protocol/dlog'
import { toJsonString } from '@bufbuild/protobuf'
import { SessionKeysSchema, type Envelope } from '@towns-protocol/proto'

type Client_Base = {
    /** The userId of the Client. */
    userId: string
    /** The signer of the Client. */
    signer: SignerContext
    /** RPC client that connects to the Towns network. */
    rpc: StreamRpcClient
    /** The environment of the Client. */
    env: string
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
    /** Get a stream by streamId and unpack it */
    getStream: (streamId: string) => Promise<ParsedStreamResponse>
    /** Unpack envelope using client config */
    unpackEnvelope: (envelope: Envelope) => Promise<ParsedEvent>
    /** Unpack envelopes using client config */
    unpackEnvelopes: (envelopes: Envelope[]) => Promise<ParsedEvent[]>
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
    env: Parameters<typeof makeRiverConfig>[0]
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
    const config = makeRiverConfig(params.env)

    let signer: SignerContext
    if ('mnemonic' in params) {
        const wallet = ethers.Wallet.fromMnemonic(params.mnemonic)
        const delegateWallet = ethers.Wallet.createRandom()
        signer = await makeSignerContext(wallet, delegateWallet)
    } else if ('privateKey' in params) {
        const wallet = new ethers.Wallet(params.privateKey)
        const delegateWallet = ethers.Wallet.createRandom()
        signer = await makeSignerContext(wallet, delegateWallet)
    } else {
        signer = await makeSignerContextFromBearerToken(params.bearerToken)
    }

    const riverProvider = makeRiverProvider(config)
    const riverRegistryDapp = new RiverRegistry(config.river.chainConfig, riverProvider)
    const urls = await riverRegistryDapp.getOperationalNodeUrls()
    const rpc = makeStreamRpcClient(urls, () => riverRegistryDapp.getOperationalNodeUrls())

    const userId = userIdFromAddress(signer.creatorAddress)

    const cryptoStore = RiverDbManager.getCryptoDb(userId)
    await cryptoStore.initialize()

    // eslint-disable-next-line prefer-const
    let crypto: GroupEncryptionCrypto

    const getStream = async (streamId: string): Promise<ParsedStreamResponse> => {
        const { disableHashValidation, disableSignatureValidation } = client
        const stream = await client.rpc.getStream({ streamId: streamIdAsBytes(streamId) })
        return unpackStream(stream.stream, {
            disableHashValidation,
            disableSignatureValidation,
        })
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

    const buildGroupEncryptionClient = (): IGroupEncryptionClient => {
        const getMiniblockInfo: IGroupEncryptionClient['getMiniblockInfo'] = async (streamId) => {
            const { streamAndCookie } = await getStream(streamId)
            return {
                miniblockNum: streamAndCookie.miniblocks[0].header.miniblockNum,
                miniblockHash: streamAndCookie.miniblocks[0].hash,
            }
        }
        const downloadUserDeviceInfo: IGroupEncryptionClient['downloadUserDeviceInfo'] = async (
            userIds,
        ) => {
            const forceDownload = userIds.length <= 10
            const promises = userIds.map(
                async (userId): Promise<{ userId: string; devices: UserDevice[] }> => {
                    const streamId = makeUserMetadataStreamId(userId)
                    try {
                        // also always download your own keys so you always share to your most up to date devices
                        if (!forceDownload && userId !== userId) {
                            const devicesFromStore = await cryptoStore.getUserDevices(userId)
                            if (devicesFromStore.length > 0) {
                                return { userId, devices: devicesFromStore }
                            }
                        }
                        // return latest 10 device keys
                        const deviceLookback = 10
                        const stream = await getStream(streamId)
                        const encryptionDevices =
                            stream.snapshot.content.case === 'userMetadataContent'
                                ? stream.snapshot.content.value.encryptionDevices
                                : []
                        const userDevices = encryptionDevices.slice(-deviceLookback)
                        await cryptoStore.saveUserDevices(userId, userDevices)
                        return { userId, devices: userDevices }
                    } catch (e) {
                        return { userId, devices: [] }
                    }
                },
            )
            return (await Promise.all(promises)).reduce((acc, current) => {
                acc[current.userId] = current.devices
                return acc
            }, {} as UserDeviceCollection)
        }

        const encryptAndShareGroupSessions: IGroupEncryptionClient['encryptAndShareGroupSessions'] =
            async (streamId, sessions, toDevices, algorithm) => {
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
                const promises = Object.entries(toDevices).map(async ([userId, deviceKeys]) => {
                    try {
                        const ciphertext = await crypto.encryptWithDeviceKeys(
                            toJsonString(SessionKeysSchema, payload),
                            deviceKeys,
                        )
                        if (Object.keys(ciphertext).length === 0) {
                            return
                        }
                        const toStreamId: string = makeUserInboxStreamId(userId)
                        const { hash: miniblockHash } = await rpc.getLastMiniblockHash({
                            streamId: streamIdAsBytes(toStreamId),
                        })
                        const event = await makeEvent(
                            signer,
                            make_UserInboxPayload_GroupEncryptionSessions({
                                streamId: streamIdAsBytes(toStreamId),
                                senderKey: userDevice.deviceKey,
                                sessionIds: sessionIds,
                                ciphertexts: ciphertext,
                                algorithm: algorithm,
                            }),
                            miniblockHash,
                        )
                        const eventId = bin_toHexString(event.hash)
                        const { error } = await rpc.addEvent({
                            streamId: streamIdAsBytes(streamId),
                            event,
                            optional: false,
                        })
                        return { miniblockHash, eventId, error }
                    } catch {
                        return undefined
                    }
                })
                await Promise.all(promises)
            }
        const getDevicesInStream: IGroupEncryptionClient['getDevicesInStream'] = async (
            streamId,
        ) => {
            const stream = await getStream(streamId)
            if (!stream) {
                return {}
            }
            const members = stream.snapshot.members?.joined.map((x) =>
                userIdFromAddress(x.userAddress),
            )
            return downloadUserDeviceInfo(members ?? [], true)
        }

        return {
            getMiniblockInfo,
            downloadUserDeviceInfo,
            encryptAndShareGroupSessions,
            getDevicesInStream,
        }
    }

    await cryptoStore.initialize()
    crypto = new GroupEncryptionCrypto(buildGroupEncryptionClient(), cryptoStore)
    await crypto.init(params.encryptionDevice)

    const { hashValidation = false, signatureValidation = false } = params
    const client = {
        crypto,
        keychain: cryptoStore,
        defaultGroupEncryptionAlgorithm: GroupEncryptionAlgorithmId.HybridGroupEncryption,
        rpc,
        signer,
        userId,
        disableHashValidation: !hashValidation,
        disableSignatureValidation: !signatureValidation,
        getStream,
        unpackEnvelope,
        unpackEnvelopes,
        env: config.environmentId,
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
