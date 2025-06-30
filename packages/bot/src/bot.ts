// Crypto Store uses IndexedDB, so we need to import fake-indexeddb/auto
import 'fake-indexeddb/auto'
import { create, fromBinary, fromJsonString, toBinary } from '@bufbuild/protobuf'

import {
    getRefEventIdFromChannelMessage,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    makeEvent,
    make_ChannelPayload_Message,
    make_DMChannelPayload_Message,
    make_GDMChannelPayload_Message,
    streamIdAsBytes,
    createTownsClient,
    type ClientV2,
    type makeRiverConfig,
    streamIdAsString,
    make_MemberPayload_KeySolicitation,
    make_UserMetadataPayload_EncryptionDevice,
    logNever,
    userIdFromAddress,
    makeUserMetadataStreamId,
    type ParsedEvent,
    unsafe_makeTags,
    getStreamMetadataUrl,
    makeBaseChainConfig,
    usernameChecksum,
    make_MemberPayload_Username,
    make_MemberPayload_DisplayName,
    make_UserMetadataPayload_ProfileImage,
    spaceIdFromChannelId,
} from '@towns-protocol/sdk'
import { type Context, type Env, type Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { default as jwt } from 'jsonwebtoken'
import EventEmitter from 'node:events'
import TypedEmitter from 'typed-emitter'
import {
    type ChannelMessage_Post_Attachment,
    type ChannelMessage_Post_Mention,
    ChannelMessage,
    type Envelope,
    ChannelMessageSchema,
    AppServiceRequestSchema,
    AppServiceResponseSchema,
    type AppServiceResponse,
    type EventPayload,
    SessionKeysSchema,
    type UserInboxPayload_GroupEncryptionSessions,
    AppPrivateDataSchema,
    MembershipOp,
    type PlainMessage,
    ChunkedMediaSchema,
    type ChunkedMedia,
    EncryptedDataSchema,
    type EncryptedData,
    Tags,
} from '@towns-protocol/proto'
import {
    bin_fromBase64,
    bin_fromHexString,
    bin_toHexString,
    bin_toString,
    check,
} from '@towns-protocol/dlog'
import {
    AES_GCM_DERIVED_ALGORITHM,
    GroupEncryptionAlgorithmId,
    parseGroupEncryptionAlgorithmId,
} from '@towns-protocol/encryption'
import {
    createClient as createViemClient,
    http,
    type Abi,
    type Account,
    type Chain,
    type Client as ViemClient,
    type ContractFunctionArgs,
    type ContractFunctionName,
} from 'viem'
import {
    readContract,
    type ReadContractParameters,
    writeContract,
    type WriteContractParameters,
} from 'viem/actions'
import { base, baseSepolia } from 'viem/chains'
import { deriveKeyAndIV, encryptAESGCM, uint8ArrayToBase64 } from '@towns-protocol/sdk-crypto'
import type { BlankEnv } from 'hono/types'

type BotActions = ReturnType<typeof buildBotActions>

export type BotPayload<T extends keyof BotEvents> = Parameters<BotEvents[T]>[1]

type MessageOpts = {
    threadId?: string
    replyId?: string
    mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
    attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
}

export type UserData = {
    /** The user ID of the user */
    userId: string
    /** The username of the user */
    username: string | null
    /** The display name of the user */
    displayName: string | null
    /** The ENS address of the user */
    ensAddress?: string
    /** The bio of the user */
    bio: string | null
    /** The NFT that the user is currently showcasing */
    nft?: {
        tokenId: string
        contractAddress: string
        chainId: number
    }
    /** URL that points to the profile picture of the user */
    profilePictureUrl: string
}

export type BotEvents = {
    message: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
            /** You can use this to check if the message is a direct message */
            isDm: boolean
            /** You can use this to check if the message is a group message */
            isGdm: boolean
        },
    ) => void | Promise<void>
    redaction: (
        handler: BotActions,
        event: BasePayload & {
            /** The event ID that got redacted */
            refEventId: string
        },
    ) => void | Promise<void>
    messageEdit: (
        handler: BotActions,
        event: BasePayload & {
            /** The event ID of the message that got edited */
            refEventId: string
            /** New message */
            message: string
        },
    ) => void | Promise<void>
    mentioned: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
        },
    ) => void | Promise<void>
    reply: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
        },
    ) => void | Promise<void>
    reaction: (
        handler: BotActions,
        event: BasePayload & {
            /** The reaction that was added */
            reaction: string
            /** The event ID of the message that got reacted to */
            messageId: string
            /** The user ID of the user that added the reaction */
            userId: string
        },
    ) => Promise<void> | void
    eventRevoke: (
        handler: BotActions,
        event: BasePayload & {
            /** The event ID of the message that got revoked */
            refEventId: string
        },
    ) => Promise<void> | void
    // TODO:
    tip: (
        handler: BotActions,
        event: BasePayload & {
            /** The amount of the tip */
            amount: bigint
            /** The currency of the tip */
            currency: `0x${string}`
        },
    ) => Promise<void> | void
    channelJoin: (handler: BotActions, event: BasePayload) => Promise<void> | void
    channelLeave: (handler: BotActions, event: BasePayload) => Promise<void> | void
    streamEvent: (
        handler: BotActions,
        event: BasePayload & { event: ParsedEvent },
    ) => Promise<void> | void
    threadMessage: (
        handler: BotActions,
        event: BasePayload & {
            /** The thread id where the message belongs to */
            threadId: string
            /** The decrypted message content */
            message: string
        },
    ) => Promise<void> | void
}

type BasePayload = {
    /** The user ID of the user that triggered the event */
    userId: string
    /** The space ID that the event was triggered in */
    spaceId: string
    /** channelId that the event was triggered in */
    channelId: string
    /** The ID of the event that triggered */
    eventId: string
}

export class Bot<
    HonoEnv extends Env = BlankEnv,
> extends (EventEmitter as new () => TypedEmitter<BotEvents>) {
    private readonly client: ClientV2<BotActions>
    botId: string
    viemClient: ViemClient
    private readonly jwtSecret: Uint8Array
    private currentMessageTags: PlainMessage<Tags> | undefined

    constructor(clientV2: ClientV2<BotActions>, viemClient: ViemClient, jwtSecretBase64: string) {
        super()
        this.client = clientV2
        this.botId = clientV2.userId
        this.viemClient = viemClient
        this.jwtSecret = bin_fromBase64(jwtSecretBase64)
        this.currentMessageTags = undefined
    }

    async start() {
        await this.client.uploadDeviceKeys()
        const jwtMiddleware = createMiddleware<HonoEnv>(this.jwtMiddleware.bind(this))

        return {
            jwtMiddleware,
            handler: this.webhookHandler.bind(this),
        }
    }

    private async jwtMiddleware(c: Context<HonoEnv>, next: Next): Promise<Response | void> {
        const authHeader = c.req.header('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return c.text('Unauthorized: Missing or malformed token', 401)
        }

        const tokenString = authHeader.substring(7)
        try {
            const botAddressBytes = bin_fromHexString(this.botId)
            const expectedAudience = bin_toHexString(botAddressBytes)
            jwt.verify(tokenString, Buffer.from(this.jwtSecret), {
                algorithms: ['HS256'],
                audience: expectedAudience,
            })
        } catch (err) {
            let errorMessage = 'Unauthorized: Token verification failed'
            if (err instanceof jwt.TokenExpiredError) {
                errorMessage = 'Unauthorized: Token expired'
            } else if (err instanceof jwt.JsonWebTokenError) {
                errorMessage = `Unauthorized: Invalid token (${err.message})`
            }
            return c.text(errorMessage, 401)
        }

        await next()
    }

    private async webhookHandler(c: Context<HonoEnv>) {
        const body = await c.req.arrayBuffer()
        const encryptionDevice = this.client.crypto.getUserDevice()
        const request = fromBinary(AppServiceRequestSchema, new Uint8Array(body))

        const statusResponse = create(AppServiceResponseSchema, {
            payload: {
                case: 'status',
                value: {
                    frameworkVersion: 1,
                    deviceKey: encryptionDevice.deviceKey,
                    fallbackKey: encryptionDevice.fallbackKey,
                },
            },
        })
        let response: AppServiceResponse = statusResponse
        if (request.payload.case === 'initialize') {
            response = create(AppServiceResponseSchema, {
                payload: {
                    case: 'initialize',
                    value: {
                        encryptionDevice,
                    },
                },
            })
        } else if (request.payload.case === 'events') {
            for (const event of request.payload.value.events) {
                await this.handleEvent(event)
            }
            response = statusResponse
        } else if (request.payload.case === 'status') {
            response = statusResponse
        }

        c.header('Content-Type', 'application/x-protobuf')
        return c.body(toBinary(AppServiceResponseSchema, response), 200)
    }

    // TODO: onTip
    private async handleEvent(appEvent: EventPayload) {
        if (!appEvent.payload.case || !appEvent.payload.value) return
        const streamId = streamIdAsString(appEvent.payload.value.streamId)

        if (appEvent.payload.case === 'messages') {
            const groupEncryptionSessionsMessages = await this.client
                .unpackEnvelopes(appEvent.payload.value.groupEncryptionSessionsMessages)
                .then((x) =>
                    x.flatMap((e) => {
                        if (
                            e.event.payload.case === 'userInboxPayload' &&
                            e.event.payload.value.content.case === 'groupEncryptionSessions'
                        ) {
                            return e.event.payload.value.content.value
                        }
                        return []
                    }),
                )
            const events = await this.client.unpackEnvelopes(appEvent.payload.value.messages)
            const zip = events.map((m, i) => [m, groupEncryptionSessionsMessages[i]] as const)
            for (const [parsed, groupEncryptionSession] of zip) {
                if (parsed.creatorUserId === this.client.userId) {
                    continue
                }
                if (!parsed.event.payload.case) {
                    continue
                }
                this.currentMessageTags = parsed.event.tags
                this.emit('streamEvent', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    eventId: parsed.hashStr,
                    event: parsed,
                })
                switch (parsed.event.payload.case) {
                    case 'channelPayload':
                    case 'dmChannelPayload':
                    case 'gdmChannelPayload': {
                        if (!parsed.event.payload.value.content.case) return
                        if (parsed.event.payload.value.content.case === 'message') {
                            const decryptedSessions = await this.client.decryptSessions(
                                streamId,
                                groupEncryptionSession,
                            )
                            await this.client.crypto.importSessionKeys(streamId, decryptedSessions)
                            const eventCleartext = await this.client.crypto.decryptGroupEvent(
                                streamId,
                                parsed.event.payload.value.content.value,
                            )
                            let channelMessage: ChannelMessage
                            if (typeof eventCleartext === 'string') {
                                channelMessage = fromJsonString(
                                    ChannelMessageSchema,
                                    eventCleartext,
                                )
                            } else {
                                channelMessage = fromBinary(ChannelMessageSchema, eventCleartext)
                            }
                            await this.handleChannelMessage(streamId, parsed, channelMessage)
                        } else if (parsed.event.payload.value.content.case === 'redaction') {
                            this.emit('eventRevoke', this.client, {
                                userId: userIdFromAddress(parsed.event.creatorAddress),
                                spaceId: spaceIdFromChannelId(streamId),
                                channelId: streamId,
                                refEventId: bin_toHexString(
                                    parsed.event.payload.value.content.value.eventId,
                                ),
                                eventId: parsed.hashStr,
                            })
                        } else if (
                            parsed.event.payload.value.content.case === 'channelProperties'
                        ) {
                            // TODO: currently, no support for channel properties (update name, topic)
                        } else if (parsed.event.payload.value.content.case === 'inception') {
                            // TODO: is there any use case for this?
                        } else {
                            logNever(parsed.event.payload.value.content)
                        }
                        break
                    }
                    case 'memberPayload': {
                        if (parsed.event.payload.value.content.case === 'membership') {
                            const membership = parsed.event.payload.value.content.value
                            const isChannel = isChannelStreamId(streamId)
                            // TODO: do we want Bot to listen to onSpaceJoin/onSpaceLeave?
                            if (!isChannel) continue
                            if (membership.op === MembershipOp.SO_JOIN) {
                                this.emit('channelJoin', this.client, {
                                    userId: userIdFromAddress(membership.userAddress),
                                    spaceId: spaceIdFromChannelId(streamId),
                                    channelId: streamId,
                                    eventId: parsed.hashStr,
                                })
                            }
                            if (membership.op === MembershipOp.SO_LEAVE) {
                                this.emit('channelLeave', this.client, {
                                    userId: userIdFromAddress(membership.userAddress),
                                    spaceId: spaceIdFromChannelId(streamId),
                                    channelId: streamId,
                                    eventId: parsed.hashStr,
                                })
                            }
                        }
                    }
                }
            }
        } else if (appEvent.payload.case === 'solicitation') {
            const missingSessionIds = appEvent.payload.value.sessionIds.filter(
                (sessionId) => sessionId !== '',
            )
            await this.client.sendKeySolicitation(streamId, missingSessionIds)
        } else {
            logNever(appEvent.payload)
        }
    }

    async handleChannelMessage(streamId: string, parsed: ParsedEvent, { payload }: ChannelMessage) {
        if (!payload.case) {
            return
        }

        switch (payload.case) {
            case 'post': {
                if (payload.value.content.case === 'text') {
                    const hasBotMention = payload.value.content.value.mentions.some(
                        (m) => m.userId === this.botId,
                    )
                    const userId = userIdFromAddress(parsed.event.creatorAddress)
                    const replyId = payload.value.replyId
                    const threadId = payload.value.threadId
                    const forwardPayload: BotPayload<'message'> = {
                        userId,
                        eventId: parsed.hashStr,
                        spaceId: spaceIdFromChannelId(streamId),
                        channelId: streamId,
                        message: payload.value.content.value.body,
                        isDm: isDMChannelStreamId(streamId),
                        isGdm: isGDMChannelStreamId(streamId),
                    }

                    if (replyId) {
                        this.emit('reply', this.client, forwardPayload)
                    } else if (threadId) {
                        this.emit('threadMessage', this.client, {
                            ...forwardPayload,
                            threadId,
                        })
                    } else if (hasBotMention) {
                        this.emit('mentioned', this.client, forwardPayload)
                    } else {
                        this.emit('message', this.client, forwardPayload)
                    }
                }
                break
            }
            case 'reaction': {
                this.emit('reaction', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    reaction: payload.value.reaction,
                    messageId: payload.value.refEventId,
                })
                break
            }
            case 'edit': {
                // TODO: framework doesnt handle non-text edits
                if (payload.value.post?.content.case !== 'text') break
                this.emit('messageEdit', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                    message: payload.value.post?.content.value.body,
                })
                break
            }
            case 'redaction': {
                this.emit('redaction', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                })
                break
            }
            default:
                logNever(payload)
        }
    }

    /**
     * Send a message to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param message - The cleartext of the message
     */
    async sendMessage(streamId: string, message: string, opts?: MessageOpts) {
        const result = await this.client.sendMessage(
            streamId,
            message,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Send a reaction to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to react to
     * @param reaction - The reaction to send
     */
    async sendReaction(streamId: string, refEventId: string, reaction: string) {
        const result = await this.client.sendReaction(
            streamId,
            refEventId,
            reaction,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Remove an specific event from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to remove
     */
    async removeEvent(streamId: string, refEventId: string) {
        const result = await this.client.removeEvent(streamId, refEventId, this.currentMessageTags)
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Edit an specific message from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param messageId - The eventId of the message to edit
     * @param message - The new message text
     */
    async editMessage(streamId: string, messageId: string, message: string) {
        const result = await this.client.editMessage(
            streamId,
            messageId,
            message,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    writeContract<
        chain extends Chain | undefined,
        account extends Account | undefined,
        const abi extends Abi | readonly unknown[],
        functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
        args extends ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
        chainOverride extends Chain | undefined,
    >(tx: WriteContractParameters<abi, functionName, args, chain, account, chainOverride>) {
        return writeContract(this.viemClient, tx as WriteContractParameters)
    }

    readContract<
        const abi extends Abi | readonly unknown[],
        functionName extends ContractFunctionName<abi, 'pure' | 'view'>,
        const args extends ContractFunctionArgs<abi, 'pure' | 'view', functionName>,
    >(parameters: ReadContractParameters<abi, functionName, args>) {
        return readContract(this.viemClient, parameters)
    }

    /**
     * Triggered when someone sends a message.
     * This is triggered for all messages, including direct messages and group messages.
     */
    onMessage(fn: BotEvents['message']) {
        this.on('message', fn)
    }

    onRedaction(fn: BotEvents['redaction']) {
        this.on('redaction', fn)
    }

    /**
     * Triggered when a message gets edited
     */
    onMessageEdit(fn: BotEvents['messageEdit']) {
        this.on('messageEdit', fn)
    }

    /**
     * Triggered when someone mentions the bot in a message
     */
    onMentioned(fn: BotEvents['mentioned']) {
        this.on('mentioned', fn)
    }

    /**
     * Triggered when someone replies to a message
     */
    onReply(fn: BotEvents['reply']) {
        this.on('reply', fn)
    }

    /**
     * Triggered when someone reacts to a message
     */
    onReaction(fn: BotEvents['reaction']) {
        this.on('reaction', fn)
    }

    /**
     * Triggered when a message is revoked by a moderator
     */
    onEventRevoke(fn: BotEvents['eventRevoke']) {
        this.on('eventRevoke', fn)
    }

    /**
     * Triggered when someone tips the bot
     * TODO: impl
     */
    onTip(fn: BotEvents['tip']) {
        this.on('tip', fn)
    }

    /**
     * Triggered when someone joins a channel
     */
    onChannelJoin(fn: BotEvents['channelJoin']) {
        this.on('channelJoin', fn)
    }

    /**
     * Triggered when someone leaves a channel
     */
    onChannelLeave(fn: BotEvents['channelLeave']) {
        this.on('channelLeave', fn)
    }

    onStreamEvent(fn: BotEvents['streamEvent']) {
        this.on('streamEvent', fn)
    }

    onThreadMessage(fn: BotEvents['threadMessage']) {
        this.on('threadMessage', fn)
    }

    // onSlashCommand(command: Commands, fn: (client: BotActions, opts: BasePayload) => void) {
    //     this.cb.onSlashCommand.set(command, fn)
    // }
}

export const makeTownsBot = async <HonoEnv extends Env = BlankEnv>(
    appPrivateDataBase64: string,
    jwtSecretBase64: string,
    env: Parameters<typeof makeRiverConfig>[0],
    baseRpcUrl?: string,
) => {
    const { privateKey, encryptionDevice } = fromBinary(
        AppPrivateDataSchema,
        bin_fromBase64(appPrivateDataBase64),
    )
    const baseConfig = makeBaseChainConfig(env)
    const viemClient = createViemClient({
        transport: baseRpcUrl
            ? http(baseRpcUrl, { batch: true })
            : http(baseConfig.rpcUrl, { batch: true }),
        // TODO: would be nice if makeBaseChainConfig returned a viem chain
        chain: baseConfig.chainConfig.chainId === base.id ? base : baseSepolia,
    })
    const client = await createTownsClient({
        privateKey,
        env,
        encryptionDevice: {
            fromExportedDevice: encryptionDevice,
        },
    }).then((x) => x.extend((townsClient) => buildBotActions(townsClient, viemClient)))
    return new Bot<HonoEnv>(client, viemClient, jwtSecretBase64)
}

const buildBotActions = (client: ClientV2, viemClient: ViemClient) => {
    const sendMessageEvent = async ({
        streamId,
        payload,
        tags,
    }: {
        streamId: string
        payload: ChannelMessage
        tags?: PlainMessage<Tags>
    }) => {
        const stream = await client.getStream(streamId)
        const { hash: prevMiniblockHash, miniblockNum: prevMiniblockNum } =
            await client.rpc.getLastMiniblockHash({
                streamId: streamIdAsBytes(streamId),
            })
        const eventTags = {
            ...unsafe_makeTags(payload),
            participatingUserAddresses: tags?.participatingUserAddresses || [],
            threadId: tags?.threadId || undefined,
        }
        const encryptionAlgorithm = stream.snapshot.members?.encryptionAlgorithm?.algorithm

        const message = await client.crypto.encryptGroupEvent(
            streamId,
            toBinary(ChannelMessageSchema, payload),
            (encryptionAlgorithm as GroupEncryptionAlgorithmId) ||
                client.defaultGroupEncryptionAlgorithm,
        )
        message.refEventId = getRefEventIdFromChannelMessage(payload)

        let event: Envelope
        if (isChannelStreamId(streamId)) {
            event = await makeEvent(
                client.signer,
                make_ChannelPayload_Message(message),
                prevMiniblockHash,
                prevMiniblockNum,
                eventTags,
            )
        } else if (isDMChannelStreamId(streamId)) {
            event = await makeEvent(
                client.signer,
                make_DMChannelPayload_Message(message),
                prevMiniblockHash,
                prevMiniblockNum,
                eventTags,
            )
        } else if (isGDMChannelStreamId(streamId)) {
            event = await makeEvent(
                client.signer,
                make_GDMChannelPayload_Message(message),
                prevMiniblockHash,
                prevMiniblockNum,
                eventTags,
            )
        } else {
            throw new Error(`Invalid stream ID type: ${streamId}`)
        }
        const eventId = bin_toHexString(event.hash)
        const { error } = await client.rpc.addEvent({
            streamId: streamIdAsBytes(streamId),
            event,
        })
        return {
            error,
            eventId,
            prevMiniblockHash,
        }
    }

    const sendKeySolicitation = async (streamId: string, sessionIds: string[]) => {
        const encryptionDevice = client.crypto.getUserDevice()

        const missingSessionIds = sessionIds.filter((sessionId) => sessionId !== '')
        const { hash: prevMiniblockHash } = await client.rpc.getLastMiniblockHash({
            streamId: streamIdAsBytes(streamId),
        })
        const event = await makeEvent(
            client.signer,
            make_MemberPayload_KeySolicitation({
                deviceKey: encryptionDevice.deviceKey,
                fallbackKey: encryptionDevice.fallbackKey,
                isNewDevice: missingSessionIds.length === 0,
                sessionIds: missingSessionIds,
            }),
            prevMiniblockHash,
        )
        const eventId = bin_toHexString(event.hash)
        const { error } = await client.rpc.addEvent({
            streamId: streamIdAsBytes(streamId),
            event,
        })
        return { eventId, error }
    }

    const uploadDeviceKeys = async () => {
        const streamId = streamIdAsBytes(makeUserMetadataStreamId(client.userId))
        const { hash: prevMiniblockHash } = await client.rpc.getLastMiniblockHash({
            streamId,
        })
        const encryptionDevice = client.crypto.getUserDevice()
        const event = await makeEvent(
            client.signer,
            make_UserMetadataPayload_EncryptionDevice({
                ...encryptionDevice,
            }),
            prevMiniblockHash,
        )
        const eventId = bin_toHexString(event.hash)
        const { error } = await client.rpc.addEvent({ streamId, event })
        return { eventId, error }
    }

    const sendMessage = async (
        streamId: string,
        message: string,
        opts?: {
            threadId?: string
            replyId?: string
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
            attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
        },
        tags?: PlainMessage<Tags>,
    ) => {
        const payload = create(ChannelMessageSchema, {
            payload: {
                case: 'post',
                value: {
                    threadId: opts?.threadId,
                    replyId: opts?.replyId,
                    replyPreview: opts?.replyId ? '🙈' : undefined,
                    threadPreview: opts?.threadId ? '🙉' : undefined,
                    content: {
                        case: 'text',
                        value: {
                            body: message,
                            attachments: opts?.attachments || [],
                            mentions: opts?.mentions || [],
                        },
                    },
                },
            },
        })
        return sendMessageEvent({ streamId, payload, tags })
    }

    const editMessage = async (
        streamId: string,
        messageId: string,
        message: string,
        tags?: PlainMessage<Tags>,
    ) => {
        const payload = create(ChannelMessageSchema, {
            payload: {
                case: 'edit',
                value: {
                    refEventId: messageId,
                    post: {
                        content: { case: 'text', value: { body: message } },
                    },
                },
            },
        })
        return sendMessageEvent({ streamId, payload, tags })
    }

    const sendDm = (
        userId: string,
        message: string,
        opts?: {
            threadId?: string
            replyId?: string
            mentions?: ChannelMessage_Post_Mention[]
            attachments?: ChannelMessage_Post_Attachment[]
        },
    ) => sendMessage(userId, message, opts)

    const sendReaction = async (
        streamId: string,
        messageId: string,
        reaction: string,
        tags?: PlainMessage<Tags>,
    ) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'reaction', value: { refEventId: messageId, reaction } },
        })
        return sendMessageEvent({ streamId, payload, tags })
    }

    const removeEvent = async (streamId: string, messageId: string, tags?: PlainMessage<Tags>) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'redaction', value: { refEventId: messageId } },
        })
        return sendMessageEvent({ streamId, payload, tags })
    }

    const setUsername = async (streamId: string, username: string) => {
        const encryptedData = await client.crypto.encryptGroupEvent(
            streamId,
            new TextEncoder().encode(username),
            client.defaultGroupEncryptionAlgorithm,
        )
        encryptedData.checksum = usernameChecksum(username, streamId)
        const { hash: prevMiniblockHash } = await client.rpc.getLastMiniblockHash({
            streamId: streamIdAsBytes(streamId),
        })
        const event = await makeEvent(
            client.signer,
            make_MemberPayload_Username(encryptedData),
            prevMiniblockHash,
        )
        const eventId = bin_toHexString(event.hash)
        const { error } = await client.rpc.addEvent({
            streamId: streamIdAsBytes(streamId),
            event,
        })
        return { eventId, error }
    }

    const setDisplayName = async (streamId: string, displayName: string) => {
        const encryptedData = await client.crypto.encryptGroupEvent(
            streamId,
            new TextEncoder().encode(displayName),
            client.defaultGroupEncryptionAlgorithm,
        )
        const { hash: prevMiniblockHash } = await client.rpc.getLastMiniblockHash({
            streamId: streamIdAsBytes(streamId),
        })
        const event = await makeEvent(
            client.signer,
            make_MemberPayload_DisplayName(encryptedData),
            prevMiniblockHash,
        )
        const eventId = bin_toHexString(event.hash)
        const { error } = await client.rpc.addEvent({
            streamId: streamIdAsBytes(streamId),
            event,
        })
        return { eventId, error }
    }

    const setUserProfileImage = async (chunkedMediaInfo: PlainMessage<ChunkedMedia>) => {
        const streamId = makeUserMetadataStreamId(client.userId)
        const { key, iv } = await deriveKeyAndIV(client.userId)
        const { ciphertext } = await encryptAESGCM(
            toBinary(ChunkedMediaSchema, create(ChunkedMediaSchema, chunkedMediaInfo)),
            key,
            iv,
        )
        const encryptedData = create(EncryptedDataSchema, {
            ciphertext: uint8ArrayToBase64(ciphertext),
            algorithm: AES_GCM_DERIVED_ALGORITHM,
        }) satisfies PlainMessage<EncryptedData>
        const { hash: prevMiniblockHash } = await client.rpc.getLastMiniblockHash({
            streamId: streamIdAsBytes(streamId),
        })
        const event = await makeEvent(
            client.signer,
            make_UserMetadataPayload_ProfileImage(encryptedData),
            prevMiniblockHash,
        )
        const eventId = bin_toHexString(event.hash)
        const { error } = await client.rpc.addEvent({
            streamId: streamIdAsBytes(streamId),
            event,
        })
        return { eventId, error }
    }

    const decryptSessions = async (
        streamId: string,
        sessions: UserInboxPayload_GroupEncryptionSessions,
    ) => {
        const { deviceKey } = client.crypto.getUserDevice()
        const ciphertext = sessions.ciphertexts[deviceKey]
        if (!ciphertext) {
            throw new Error('No ciphertext found for device key')
        }
        const parsed = parseGroupEncryptionAlgorithmId(
            sessions.algorithm,
            GroupEncryptionAlgorithmId.GroupEncryption,
        )
        if (parsed.kind === 'unrecognized') {
            throw new Error('Invalid algorithm')
        }
        const algorithm = parsed.value
        // decrypt the session keys
        const cleartext = await client.crypto.decryptWithDeviceKey(ciphertext, sessions.senderKey)
        const sessionKeys = fromJsonString(SessionKeysSchema, cleartext)
        check(sessionKeys.keys.length === sessions.sessionIds.length, 'bad sessionKeys')
        // make group sessions that can be used to decrypt events
        return sessions.sessionIds.map((sessionId, i) => ({
            streamId: streamId,
            sessionId,
            sessionKey: sessionKeys.keys[i],
            algorithm,
        }))
    }

    /**
     * Fetches and attempts to decrypt member-specific data (username, display name, nft, ensAddress)
     * for a given user within a specific stream (channel/space).
     * It requires the data to be in the stream snapshot.
     *
     * NOTE: Decryption relies on the bot having the necessary group session keys for the
     * specified stream. If somehow the keys are missing, decryption will fail, and null values will be returned for username/displayName.
     *
     * @deprecated Not planned for now
     * @param streamId - The ID of the channel or space stream.
     * @param userId -  The ID of the member whose data is being requested.
     */
    const getUserData = async (streamId: string, userId: string): Promise<UserData | null> => {
        try {
            const stream = await client.getStream(streamId)
            const members = stream.snapshot.members?.joined
            if (!members) {
                return null
            }
            const member = members.find((m) => userIdFromAddress(m.userAddress) === userId)
            if (!member) {
                return null
            }
            let displayName: string | null = null
            let username: string | null = null
            const [usernameDecrypted, displayNameDecrypted] = await Promise.all([
                member.username?.data
                    ? client.crypto.decryptGroupEvent(streamId, member.username.data)
                    : null,
                member.displayName?.data
                    ? client.crypto.decryptGroupEvent(streamId, member.displayName.data)
                    : null,
            ])
            if (usernameDecrypted) {
                username =
                    typeof usernameDecrypted === 'string'
                        ? usernameDecrypted
                        : bin_toString(usernameDecrypted)
            }
            if (displayNameDecrypted) {
                displayName =
                    typeof displayNameDecrypted === 'string'
                        ? displayNameDecrypted
                        : bin_toString(displayNameDecrypted)
            }
            let ensAddress = undefined
            if (member.ensAddress) {
                ensAddress = `0x${bin_toHexString(member.ensAddress)}`
            }
            let nft = undefined
            if (member.nft) {
                nft = {
                    tokenId: bin_toString(member.nft.tokenId),
                    contractAddress: `0x${bin_toHexString(member.nft.contractAddress)}`,
                    chainId: member.nft.chainId,
                }
            }
            const bio = await fetch(`${getStreamMetadataUrl(client.env)}/user/${userId}/bio`)
                .then((res) => res.json())
                .then((data: { bio: string }) => data.bio)
                .catch(() => null)
            const profilePictureUrl = `${getStreamMetadataUrl(client.env)}/user/${userId}/image`
            return {
                userId,
                username,
                displayName,
                ensAddress,
                nft,
                bio,
                profilePictureUrl,
            }
        } catch {
            return null
        }
    }

    return {
        // Is it those enough?
        // TODO: think about a web3 use case..
        writeContract: <
            chain extends Chain | undefined,
            account extends Account | undefined,
            const abi extends Abi | readonly unknown[],
            functionName extends ContractFunctionName<abi, 'nonpayable' | 'payable'>,
            args extends ContractFunctionArgs<abi, 'nonpayable' | 'payable', functionName>,
            chainOverride extends Chain | undefined,
        >(
            tx: WriteContractParameters<abi, functionName, args, chain, account, chainOverride>,
        ) => writeContract(viemClient, tx as WriteContractParameters),
        readContract: <
            const abi extends Abi | readonly unknown[],
            functionName extends ContractFunctionName<abi, 'pure' | 'view'>,
            const args extends ContractFunctionArgs<abi, 'pure' | 'view', functionName>,
        >(
            parameters: ReadContractParameters<abi, functionName, args>,
        ) => readContract(viemClient, parameters),
        sendMessage,
        editMessage,
        sendDm,
        sendReaction,
        removeEvent,
        sendKeySolicitation,
        uploadDeviceKeys,
        decryptSessions,
        setUsername,
        setDisplayName,
        setUserProfileImage,
        /** @deprecated Not planned for now */
        getUserData,
    }
}
