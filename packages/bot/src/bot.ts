import { create, fromBinary, fromJsonString, toBinary } from '@bufbuild/protobuf'
import { utils, ethers } from 'ethers'
import { SpaceDapp, Permission } from '@towns-protocol/web3'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { stringify as superjsonStringify, parse as superjsonParse } from 'superjson'
import {
    getRefEventIdFromChannelMessage,
    isChannelStreamId,
    make_ChannelPayload_Message,
    createTownsClient,
    type ClientV2,
    streamIdAsString,
    make_MemberPayload_KeySolicitation,
    make_UserMetadataPayload_EncryptionDevice,
    logNever,
    userIdFromAddress,
    makeUserMetadataStreamId,
    type ParsedEvent,
    unsafe_makeTags,
    townsEnv,
    spaceIdFromChannelId,
    type CreateTownsClientParams,
    make_ChannelPayload_Redaction,
    parseAppPrivateData,
    makeEvent,
    make_MediaPayload_Inception,
    make_MediaPayload_Chunk,
    makeUniqueMediaStreamId,
    streamIdAsBytes,
    addressFromUserId,
    userIdToAddress,
    unpackEnvelope,
} from '@towns-protocol/sdk'
import { type Context, type Env, type Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { default as jwt } from 'jsonwebtoken'
import { createNanoEvents, type Emitter } from 'nanoevents'
import imageSize from 'image-size'
import {
    type ChannelMessage_Post_Attachment,
    type ChannelMessage_Post_Mention,
    ChannelMessage,
    ChannelMessageSchema,
    AppServiceRequestSchema,
    AppServiceResponseSchema,
    type AppServiceResponse,
    type EventPayload,
    MembershipOp,
    type PlainMessage,
    Tags,
    MessageInteractionType,
    type SlashCommand,
    type SnapshotCaseType,
    type Snapshot,
    ChannelMessage_Post_Content_ImageSchema,
    ChannelMessage_Post_Content_Image_InfoSchema,
    ChunkedMediaSchema,
    CreationCookieSchema,
} from '@towns-protocol/proto'
import {
    bin_fromBase64,
    bin_fromHexString,
    bin_toHexString,
    check,
    dlog,
} from '@towns-protocol/utils'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import { encryptChunkedAESGCM } from '@towns-protocol/sdk-crypto'

import {
    http,
    type Chain,
    type Prettify,
    type Transport,
    type Hex,
    type Address,
    createClient,
    type Client,
    type Account,
    type WalletClient,
    createWalletClient,
} from 'viem'
import { readContract } from 'viem/actions'
import { base, baseSepolia, foundry } from 'viem/chains'
import type { BlankEnv } from 'hono/types'
import { SnapshotGetter } from './snapshot-getter'
import packageJson from '../package.json' with { type: 'json' }
import { privateKeyToAccount } from 'viem/accounts'
import appRegistryAbi from '@towns-protocol/generated/dev/abis/IAppRegistry.abi'

type BotActions = ReturnType<typeof buildBotActions>

export type BotHandler = ReturnType<typeof buildBotActions>

// StandardSchema type aliases for convenience
export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
>['input']

export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
>['output']

const debug = dlog('csb:bot')

export type BotPayload<
    T extends keyof BotEvents<Commands>,
    Commands extends PlainMessage<SlashCommand>[] = [],
> = Parameters<BotEvents<Commands>[T]>[1]

type ImageAttachment = {
    type: 'image'
    alt?: string
    url: string
}

type ChunkedMediaAttachment =
    | {
          type: 'chunked'
          data: Blob
          width?: number
          height?: number
          filename: string
      }
    | {
          type: 'chunked'
          data: Uint8Array
          width?: number
          height?: number
          filename: string
          mimetype: string
      }

export type MessageOpts = {
    threadId?: string
    replyId?: string
    ephemeral?: boolean
}

export type PostMessageOpts = MessageOpts & {
    mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
    attachments?: Array<ImageAttachment | ChunkedMediaAttachment>
}

export type BotEvents<Commands extends PlainMessage<SlashCommand>[] = []> = {
    message: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
            /** In case of a reply, that's  the eventId of the message that got replied */
            replyId: string | undefined
            /** In case of a thread, that's the thread id where the message belongs to */
            threadId: string | undefined
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
            /** Convenience flag to check if the bot was mentioned */
            isMentioned: boolean
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
            /** In case of a reply, that's  the eventId of the message that got replied */
            replyId: string | undefined
            /** In case of a thread, that's the thread id where the message belongs to */
            threadId: string | undefined
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
            /** Convenience flag to check if the bot was mentioned */
            isMentioned: boolean
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
    tip: (
        handler: BotActions,
        event: BasePayload & {
            /** The message ID of the parent of the tip */
            messageId: string
            /** The address of the sender of the tip */
            senderAddress: string
            /** The address of the receiver of the tip */
            receiverAddress: string
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
    slashCommand: (
        handler: BotActions,
        event: BasePayload & {
            /** The slash command that was invoked (without the /) */
            command: Commands[number]['name']
            /** Arguments passed after the command
             * @example
             * ```
             * /help
             * args: []
             * ```
             * ```
             * /sum 1 2
             * args: ['1', '2']
             * ```
             */
            args: string[]
            /** Users mentioned in the command */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
            /** The eventId of the message that got replied */
            replyId: string | undefined
            /** The thread id where the message belongs to */
            threadId: string | undefined
        },
    ) => Promise<void> | void
    rawGmMessage: (
        handler: BotActions,
        event: BasePayload & { typeUrl: string; message: Uint8Array },
    ) => void | Promise<void>
    gm: <Schema extends StandardSchemaV1>(
        handler: BotActions,
        event: BasePayload & { typeUrl: string; schema: Schema; data: InferOutput<Schema> },
    ) => void | Promise<void>
}

export type BasePayload = {
    /** The user ID of the user that triggered the event */
    userId: string
    /** The space ID that the event was triggered in */
    spaceId: string
    /** channelId that the event was triggered in */
    channelId: string
    /** The ID of the event that triggered */
    eventId: string
    /** The creation time of the event */
    createdAt: Date
}

export class Bot<
    Commands extends PlainMessage<SlashCommand>[] = [],
    HonoEnv extends Env = BlankEnv,
> {
    private readonly client: ClientV2<BotActions>
    readonly appAddress: Address
    botId: string
    viem: WalletClient<Transport, Chain, Account>
    snapshot: Prettify<ReturnType<typeof SnapshotGetter>>
    private readonly jwtSecret: Uint8Array
    private currentMessageTags: PlainMessage<Tags> | undefined
    private readonly emitter: Emitter<BotEvents<Commands>> = createNanoEvents()
    private readonly slashCommandHandlers: Map<string, BotEvents<Commands>['slashCommand']> =
        new Map()
    private readonly gmTypedHandlers: Map<
        string,
        {
            schema: StandardSchemaV1
            handler: (
                handler: BotActions,
                event: BasePayload & { typeUrl: string; data: any },
            ) => void | Promise<void>
        }
    > = new Map()
    private readonly commands: Commands | undefined

    constructor(
        clientV2: ClientV2<BotActions>,
        viem: WalletClient<Transport, Chain, Account>,
        jwtSecretBase64: string,
        appAddress: Address,
        commands?: Commands,
    ) {
        this.client = clientV2
        this.botId = clientV2.userId
        this.viem = viem
        this.jwtSecret = bin_fromBase64(jwtSecretBase64)
        this.currentMessageTags = undefined
        this.commands = commands
        this.appAddress = appAddress
        this.snapshot = clientV2.snapshot
    }

    start() {
        const jwtMiddleware = createMiddleware<HonoEnv>(this.jwtMiddleware.bind(this))
        debug('start')

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
        debug('webhook', request)
        const statusResponse = create(AppServiceResponseSchema, {
            payload: {
                case: 'status',
                value: {
                    frameworkVersion: 1,
                    clientVersion: `javascript:${packageJson.name}:${packageJson.version}`,
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
                const createdAt = new Date(Number(parsed.event.createdAtEpochMs))
                this.currentMessageTags = parsed.event.tags
                debug('emit:streamEvent', {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    channelId: streamId,
                    eventId: parsed.hashStr,
                })
                this.emitter.emit('streamEvent', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    eventId: parsed.hashStr,
                    event: parsed,
                    createdAt,
                })
                switch (parsed.event.payload.case) {
                    case 'channelPayload':
                    case 'dmChannelPayload':
                    case 'gdmChannelPayload': {
                        if (!parsed.event.payload.value.content.case) return
                        if (parsed.event.payload.value.content.case === 'message') {
                            await this.client.importGroupEncryptionSessions({
                                streamId,
                                sessions: groupEncryptionSession,
                            })
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
                            const refEventId = bin_toHexString(
                                parsed.event.payload.value.content.value.eventId,
                            )
                            debug('emit:eventRevoke', {
                                userId: userIdFromAddress(parsed.event.creatorAddress),
                                channelId: streamId,
                                refEventId,
                            })
                            this.emitter.emit('eventRevoke', this.client, {
                                userId: userIdFromAddress(parsed.event.creatorAddress),
                                spaceId: spaceIdFromChannelId(streamId),
                                channelId: streamId,
                                refEventId,
                                eventId: parsed.hashStr,
                                createdAt,
                            })
                        } else if (
                            parsed.event.payload.value.content.case === 'channelProperties'
                        ) {
                            // TODO: currently, no support for channel properties (update name, topic)
                        } else if (parsed.event.payload.value.content.case === 'inception') {
                            // TODO: is there any use case for this?
                        } else if (parsed.event.payload.value.content.case === 'custom') {
                            // TODO: what to do with custom payload for bot?
                        } else {
                            logNever(parsed.event.payload.value.content)
                        }
                        break
                    }
                    case 'memberPayload': {
                        switch (parsed.event.payload.value.content.case) {
                            case 'membership':
                                {
                                    const membership = parsed.event.payload.value.content.value
                                    const isChannel = isChannelStreamId(streamId)
                                    // TODO: do we want Bot to listen to onSpaceJoin/onSpaceLeave?
                                    if (!isChannel) continue
                                    if (membership.op === MembershipOp.SO_JOIN) {
                                        debug('emit:channelJoin', {
                                            userId: userIdFromAddress(membership.userAddress),
                                            channelId: streamId,
                                            eventId: parsed.hashStr,
                                        })
                                        this.emitter.emit('channelJoin', this.client, {
                                            userId: userIdFromAddress(membership.userAddress),
                                            spaceId: spaceIdFromChannelId(streamId),
                                            channelId: streamId,
                                            eventId: parsed.hashStr,
                                            createdAt,
                                        })
                                    }
                                    if (membership.op === MembershipOp.SO_LEAVE) {
                                        debug('emit:channelLeave', {
                                            userId: userIdFromAddress(membership.userAddress),
                                            channelId: streamId,
                                            eventId: parsed.hashStr,
                                        })
                                        this.emitter.emit('channelLeave', this.client, {
                                            userId: userIdFromAddress(membership.userAddress),
                                            spaceId: spaceIdFromChannelId(streamId),
                                            channelId: streamId,
                                            eventId: parsed.hashStr,
                                            createdAt,
                                        })
                                    }
                                }
                                break

                            case 'memberBlockchainTransaction':
                                {
                                    const transactionContent =
                                        parsed.event.payload.value.content.value.transaction
                                            ?.content

                                    switch (transactionContent?.case) {
                                        case 'spaceReview':
                                            break
                                        case 'tokenTransfer':
                                            break
                                        case 'tip':
                                            {
                                                const tipEvent = transactionContent.value.event
                                                if (!tipEvent) {
                                                    return
                                                }
                                                const currency = utils.getAddress(
                                                    bin_toHexString(tipEvent.currency),
                                                )
                                                const senderAddressBytes =
                                                    parsed.event.payload.value.content.value
                                                        .fromUserAddress
                                                const senderAddress =
                                                    userIdFromAddress(senderAddressBytes)
                                                const receiverAddress = userIdFromAddress(
                                                    transactionContent.value.toUserAddress,
                                                )
                                                debug('emit:tip', {
                                                    senderAddress,
                                                    receiverAddress,
                                                    amount: tipEvent.amount.toString(),
                                                    currency,
                                                    messageId: bin_toHexString(tipEvent.messageId),
                                                })
                                                this.emitter.emit('tip', this.client, {
                                                    userId: senderAddress,
                                                    spaceId: spaceIdFromChannelId(streamId),
                                                    channelId: streamId,
                                                    eventId: parsed.hashStr,
                                                    createdAt,
                                                    amount: tipEvent.amount,
                                                    currency: currency as `0x${string}`,
                                                    senderAddress: senderAddress,
                                                    receiverAddress,
                                                    messageId: bin_toHexString(tipEvent.messageId),
                                                })
                                            }
                                            break
                                        case undefined:
                                            break
                                        default:
                                            logNever(transactionContent)
                                    }
                                }
                                break
                            case 'keySolicitation':
                            case 'keyFulfillment':
                            case 'displayName':
                            case 'username':
                            case 'ensAddress':
                            case 'nft':
                            case 'pin':
                            case 'unpin':
                            case 'encryptionAlgorithm':
                                break
                            case undefined:
                                break
                            default:
                                logNever(parsed.event.payload.value.content)
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

        const createdAt = new Date(Number(parsed.event.createdAtEpochMs))
        switch (payload.case) {
            case 'post': {
                if (payload.value.content.case === 'text') {
                    const userId = userIdFromAddress(parsed.event.creatorAddress)
                    const replyId = payload.value.replyId
                    const threadId = payload.value.threadId
                    const mentions = parseMentions(payload.value.content.value.mentions)
                    const isMentioned = mentions.some((m) => m.userId === this.botId)
                    const forwardPayload: BotPayload<'message', Commands> = {
                        userId,
                        eventId: parsed.hashStr,
                        spaceId: spaceIdFromChannelId(streamId),
                        channelId: streamId,
                        message: payload.value.content.value.body,
                        createdAt,
                        mentions,
                        isMentioned,
                        replyId,
                        threadId,
                    }

                    if (
                        parsed.event.tags?.messageInteractionType ===
                        MessageInteractionType.SLASH_COMMAND
                    ) {
                        const { command, args } = parseSlashCommand(
                            payload.value.content.value.body,
                        )
                        const handler = this.slashCommandHandlers.get(command)
                        if (handler) {
                            void handler(this.client, {
                                ...forwardPayload,
                                command: command as Commands[number]['name'],
                                args,
                                replyId,
                                threadId,
                            })
                        }
                    } else {
                        debug('emit:message', forwardPayload)
                        this.emitter.emit('message', this.client, forwardPayload)
                    }
                } else if (payload.value.content.case === 'gm') {
                    const userId = userIdFromAddress(parsed.event.creatorAddress)
                    const gmContent = payload.value.content.value

                    const { typeUrl, value } = gmContent

                    this.emitter.emit('rawGmMessage', this.client, {
                        userId,
                        spaceId: spaceIdFromChannelId(streamId),
                        channelId: streamId,
                        eventId: parsed.hashStr,
                        createdAt,
                        typeUrl,
                        message: value ?? new Uint8Array(),
                    })

                    const typedHandler = this.gmTypedHandlers.get(typeUrl)

                    if (typedHandler) {
                        try {
                            const possibleJsonString = new TextDecoder().decode(value)
                            const deserializedData =
                                superjsonParse<InferOutput<typeof typedHandler.schema>>(
                                    possibleJsonString,
                                )
                            const result =
                                await typedHandler.schema['~standard'].validate(deserializedData)
                            if ('issues' in result && result.issues) {
                                debug('GM validation failed', { typeUrl, issues: result.issues })
                            } else {
                                debug('emit:gmMessage', { userId, channelId: streamId })
                                void typedHandler.handler(this.client, {
                                    userId,
                                    spaceId: spaceIdFromChannelId(streamId),
                                    channelId: streamId,
                                    eventId: parsed.hashStr,
                                    createdAt,
                                    typeUrl,
                                    data: result.value,
                                })
                            }
                        } catch (error) {
                            debug('GM handler error', { typeUrl, error })
                        }
                    }
                }
                break
            }
            case 'reaction': {
                debug('emit:reaction', {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    channelId: streamId,
                    reaction: payload.value.reaction,
                    messageId: payload.value.refEventId,
                })
                this.emitter.emit('reaction', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    reaction: payload.value.reaction,
                    messageId: payload.value.refEventId,
                    createdAt,
                })
                break
            }
            case 'edit': {
                // TODO: framework doesnt handle non-text edits
                if (payload.value.post?.content.case !== 'text') break
                const mentions = parseMentions(payload.value.post?.content.value.mentions)
                const isMentioned = mentions.some((m) => m.userId === this.botId)
                debug('emit:messageEdit', {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                    messagePreview: payload.value.post?.content.value.body.substring(0, 50),
                    isMentioned,
                })
                this.emitter.emit('messageEdit', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                    message: payload.value.post?.content.value.body,
                    mentions,
                    isMentioned,
                    createdAt,
                    replyId: payload.value.post?.replyId,
                    threadId: payload.value.post?.threadId,
                })
                break
            }
            case 'redaction': {
                debug('emit:redaction', {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                })
                this.emitter.emit('redaction', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                    createdAt,
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
     * @param opts - The options for the message
     */
    async sendMessage(streamId: string, message: string, opts?: PostMessageOpts) {
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
     * Remove an specific event from a stream as an admin. This is only available if you have Permission.Redact
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param refEventId - The eventId of the event to remove
     */
    async adminRemoveEvent(streamId: string, refEventId: string) {
        const result = await this.client.adminRemoveEvent(streamId, refEventId)
        return result
    }

    /**
     * Edit an specific message from a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param messageId - The eventId of the message to edit
     * @param message - The new message text
     */
    async editMessage(
        streamId: string,
        messageId: string,
        message: string,
        opts?: PostMessageOpts,
    ) {
        const result = await this.client.editMessage(
            streamId,
            messageId,
            message,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Send a GM (generic message) to a stream with schema validation
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param typeUrl - The type URL identifying the message format
     * @param schema - StandardSchema for validation
     * @param data - Data to validate and send
     */
    async sendGM<Schema extends StandardSchemaV1>(
        streamId: string,
        typeUrl: string,
        schema: Schema,
        data: InferInput<Schema>,
        opts?: MessageOpts,
    ) {
        const result = await this.client.sendGM(
            streamId,
            typeUrl,
            schema,
            data,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    /**
     * Send a raw GM (generic message) to a stream without schema validation
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param typeUrl - The type URL identifying the message format
     * @param message - Optional raw message data as bytes
     * @param opts - The options for the message
     */
    async sendRawGM(streamId: string, typeUrl: string, message: Uint8Array, opts?: MessageOpts) {
        const result = await this.client.sendRawGM(
            streamId,
            typeUrl,
            message,
            opts,
            this.currentMessageTags,
        )
        this.currentMessageTags = undefined
        return result
    }

    async hasAdminPermission(userId: string, spaceId: string) {
        return this.client.hasAdminPermission(userId, spaceId)
    }

    async checkPermission(streamId: string, userId: string, permission: Permission) {
        return this.client.checkPermission(streamId, userId, permission)
    }

    /**
     * Ban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     * @param userId - The userId of the user to ban
     * @param spaceId - The spaceId of the space to ban the user in
     */
    async ban(userId: string, spaceId: string) {
        return this.client.ban(userId, spaceId)
    }

    /**
     * Unban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     * @param userId - The userId of the user to unban
     * @param spaceId - The spaceId of the space to unban the user in
     */
    async unban(userId: string, spaceId: string) {
        return this.client.unban(userId, spaceId)
    }

    /**
     * Triggered when someone sends a message.
     * This is triggered for all messages, including direct messages and group messages.
     */
    onMessage(fn: BotEvents['message']) {
        this.emitter.on('message', fn)
    }

    onRedaction(fn: BotEvents['redaction']) {
        this.emitter.on('redaction', fn)
    }

    /**
     * Triggered when a message gets edited
     */
    onMessageEdit(fn: BotEvents['messageEdit']) {
        this.emitter.on('messageEdit', fn)
    }

    /**
     * Triggered when someone reacts to a message
     */
    onReaction(fn: BotEvents['reaction']) {
        this.emitter.on('reaction', fn)
    }

    /**
     * Triggered when a message is revoked by a moderator
     */
    onEventRevoke(fn: BotEvents['eventRevoke']) {
        this.emitter.on('eventRevoke', fn)
    }

    /**
     * Triggered when someone tips the bot
     */
    onTip(fn: BotEvents['tip']) {
        this.emitter.on('tip', fn)
    }

    /**
     * Triggered when someone joins a channel
     */
    onChannelJoin(fn: BotEvents['channelJoin']) {
        this.emitter.on('channelJoin', fn)
    }

    /**
     * Triggered when someone leaves a channel
     */
    onChannelLeave(fn: BotEvents['channelLeave']) {
        this.emitter.on('channelLeave', fn)
    }

    onStreamEvent(fn: BotEvents['streamEvent']) {
        this.emitter.on('streamEvent', fn)
    }

    onSlashCommand(command: Commands[number]['name'], fn: BotEvents<Commands>['slashCommand']) {
        this.slashCommandHandlers.set(command, fn)
    }

    /**
     * Triggered when someone sends a GM (generic message) with type validation using StandardSchema
     * @param typeUrl - The type URL to listen for
     * @param schema - The StandardSchema to validate the message data
     * @param handler - The handler function to call when a message is received
     */
    onGmMessage<Schema extends StandardSchemaV1>(
        typeUrl: string,
        schema: Schema,
        handler: (
            handler: BotActions,
            event: BasePayload & { typeUrl: string; data: InferOutput<Schema> },
        ) => void | Promise<void>,
    ) {
        this.gmTypedHandlers.set(typeUrl, { schema, handler: handler as any })
    }

    onRawGmMessage(handler: BotEvents['rawGmMessage']) {
        this.emitter.on('rawGmMessage', handler)
    }
}

export const makeTownsBot = async <
    Commands extends PlainMessage<SlashCommand>[] = [],
    HonoEnv extends Env = BlankEnv,
>(
    appPrivateData: string,
    jwtSecretBase64: string,
    opts: {
        baseRpcUrl?: string
        commands?: Commands
    } & Partial<Omit<CreateTownsClientParams, 'env' | 'encryptionDevice'>> = {},
) => {
    const { baseRpcUrl, ...clientOpts } = opts
    let appAddress: Address | undefined
    const {
        privateKey,
        encryptionDevice,
        env,
        appAddress: appAddressFromPrivateData,
    } = parseAppPrivateData(appPrivateData)
    if (!env) {
        throw new Error('Failed to parse APP_PRIVATE_DATA')
    }
    if (appAddressFromPrivateData) {
        appAddress = appAddressFromPrivateData
    }
    const account = privateKeyToAccount(privateKey as Hex)

    const baseConfig = townsEnv().makeBaseChainConfig(env)
    const getChain = (chainId: number) => {
        if (chainId === base.id) return base
        if (chainId === foundry.id) return foundry
        return baseSepolia
    }
    const chain = getChain(baseConfig.chainConfig.chainId)
    const viem = createWalletClient({
        account,
        transport: baseRpcUrl
            ? http(baseRpcUrl, { batch: true })
            : http(baseConfig.rpcUrl, { batch: true }),
        chain,
    })

    const spaceDapp = new SpaceDapp(
        baseConfig.chainConfig,
        new ethers.providers.JsonRpcProvider(baseRpcUrl || baseConfig.rpcUrl),
    )
    if (!appAddress) {
        appAddress = await readContract(viem, {
            address: baseConfig.chainConfig.addresses.appRegistry,
            abi: appRegistryAbi,
            functionName: 'getAppByClient',
            args: [account.address],
        })
    }

    const client = await createTownsClient({
        privateKey,
        env,
        encryptionDevice: {
            fromExportedDevice: encryptionDevice,
        },
        ...clientOpts,
    }).then((x) =>
        x.extend((townsClient) => buildBotActions(townsClient, viem, spaceDapp, appAddress)),
    )
    await client.uploadDeviceKeys()
    return new Bot<Commands, HonoEnv>(client, viem, jwtSecretBase64, appAddress, opts.commands)
}

const buildBotActions = (
    client: ClientV2,
    _viem: WalletClient<Transport, Chain, Account>,
    spaceDapp: SpaceDapp,
    _appAddress: string,
) => {
    const CHUNK_SIZE = 1200000 // 1.2MB max per chunk (including auth tag)

    const createChunkedMediaAttachment = async (
        attachment: ChunkedMediaAttachment,
    ): Promise<PlainMessage<ChannelMessage_Post_Attachment>> => {
        let data: Uint8Array
        let mimetype: string

        if (attachment.data instanceof Blob) {
            const buffer = await attachment.data.arrayBuffer()
            data = new Uint8Array(buffer)
            mimetype = attachment.data.type
        } else {
            data = attachment.data
            if ('mimetype' in attachment) {
                mimetype = attachment.mimetype
            } else {
                throw new Error('mimetype is required for Uint8Array data')
            }
        }

        let width = attachment.width || 0
        let height = attachment.height || 0

        if (mimetype.startsWith('image/') && (!width || !height)) {
            const dimensions = imageSize(data)
            width = dimensions.width || 0
            height = dimensions.height || 0
        }

        const { chunks, secretKey } = await encryptChunkedAESGCM(data, CHUNK_SIZE)
        const chunkCount = chunks.length

        if (chunkCount === 0) {
            throw new Error('No media chunks generated')
        }

        // TODO: Implement thumbnail generation with sharp
        const thumbnail = undefined

        const streamId = makeUniqueMediaStreamId()
        const events = await Promise.all([
            makeEvent(
                client.signerContext,
                make_MediaPayload_Inception({
                    streamId: streamIdAsBytes(streamId),
                    userId: addressFromUserId(client.userId),
                    chunkCount,
                    perChunkEncryption: true,
                }),
            ),
            makeEvent(
                client.signerContext,
                make_MediaPayload_Chunk({
                    data: chunks[0].ciphertext,
                    chunkIndex: 0,
                    iv: chunks[0].iv,
                }),
            ),
        ])
        const mediaStreamResponse = await client.rpc.createMediaStream({
            events,
            streamId: streamIdAsBytes(streamId),
        })

        if (!mediaStreamResponse?.nextCreationCookie) {
            throw new Error('Failed to create media stream')
        }

        if (chunkCount > 1) {
            let cc = create(CreationCookieSchema, mediaStreamResponse.nextCreationCookie)
            for (let chunkIndex = 1; chunkIndex < chunkCount; chunkIndex++) {
                const chunkEvent = await makeEvent(
                    client.signerContext,
                    make_MediaPayload_Chunk({
                        data: chunks[chunkIndex].ciphertext,
                        chunkIndex: chunkIndex,
                        iv: chunks[chunkIndex].iv,
                    }),
                    cc.prevMiniblockHash,
                )
                const result = await client.rpc.addMediaEvent({
                    event: chunkEvent,
                    creationCookie: cc,
                    last: chunkIndex === chunkCount - 1,
                })

                if (!result?.creationCookie) {
                    throw new Error('Failed to send media chunk')
                }

                cc = create(CreationCookieSchema, result.creationCookie)
            }
        }

        const mediaStreamInfo = { creationCookie: mediaStreamResponse.nextCreationCookie }

        return {
            content: {
                case: 'chunkedMedia',
                value: create(ChunkedMediaSchema, {
                    info: {
                        filename: attachment.filename,
                        mimetype: mimetype,
                        widthPixels: width,
                        heightPixels: height,
                        sizeBytes: BigInt(data.length),
                    },
                    streamId: streamIdAsString(mediaStreamInfo.creationCookie.streamId),
                    encryption: {
                        case: 'aesgcm',
                        value: {
                            iv: new Uint8Array(0),
                            secretKey: secretKey,
                        },
                    },
                    thumbnail,
                }),
            },
        }
    }

    const createImageAttachmentFromURL = async (
        attachment: ImageAttachment,
    ): Promise<PlainMessage<ChannelMessage_Post_Attachment> | null> => {
        try {
            const response = await fetch(attachment.url)
            if (!response.ok) {
                return null
            }
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.startsWith('image/')) {
                // eslint-disable-next-line no-console
                console.warn(
                    `A non-image URL attachment was provided. ${attachment.url} (Content-Type: ${contentType || 'unknown'})`,
                )
                return null
            }
            const bytes = await response.bytes()
            const dimensions = imageSize(bytes)
            const width = dimensions.width || 0
            const height = dimensions.height || 0
            const image = create(ChannelMessage_Post_Content_ImageSchema, {
                title: attachment.alt || '',
                info: create(ChannelMessage_Post_Content_Image_InfoSchema, {
                    url: attachment.url,
                    mimetype: contentType,
                    width,
                    height,
                }),
            })

            return {
                content: {
                    case: 'image',
                    value: image,
                },
            }
        } catch {
            return null
        }
    }

    const sendMessageEvent = async ({
        streamId,
        payload,
        tags,
        ephemeral,
    }: {
        streamId: string
        payload: ChannelMessage
        tags?: PlainMessage<Tags>
        ephemeral?: boolean
    }) => {
        const miniblockInfo = await client.getMiniblockInfo(streamId)
        const eventTags = {
            ...unsafe_makeTags(payload),
            participatingUserAddresses: tags?.participatingUserAddresses || [],
            threadId: tags?.threadId || undefined,
        }
        const encryptionAlgorithm = miniblockInfo.encryptionAlgorithm?.algorithm
            ? (miniblockInfo.encryptionAlgorithm.algorithm as GroupEncryptionAlgorithmId)
            : client.defaultGroupEncryptionAlgorithm

        if (!(await client.crypto.hasOutboundSession(streamId, encryptionAlgorithm))) {
            const appService = await client.appServiceClient()
            try {
                const sessionResp = await appService.getSession({
                    appId: userIdToAddress(client.userId),
                    identifier: {
                        case: 'streamId',
                        value: streamIdAsBytes(streamId),
                    },
                })
                if (sessionResp.groupEncryptionSessions) {
                    const parsedEvent = await unpackEnvelope(
                        sessionResp.groupEncryptionSessions,
                        client.unpackEnvelopeOpts,
                    )
                    check(
                        parsedEvent.event.payload.case === 'userInboxPayload' &&
                            parsedEvent.event.payload.value.content.case ===
                                'groupEncryptionSessions',
                        'invalid event payload',
                    )
                    await client.importGroupEncryptionSessions({
                        streamId,
                        sessions: parsedEvent.event.payload.value.content.value,
                    })
                }
            } catch {
                // ignore error (should log)
            }
        }

        const message = await client.crypto.encryptGroupEvent(
            streamId,
            toBinary(ChannelMessageSchema, payload),
            encryptionAlgorithm,
        )
        message.refEventId = getRefEventIdFromChannelMessage(payload)

        if (!isChannelStreamId(streamId)) {
            throw new Error(
                `Invalid stream ID type: ${streamId} - only channel streams are supported`,
            )
        }
        const eventPayload = make_ChannelPayload_Message(message)
        return client.sendEvent(streamId, eventPayload, eventTags, ephemeral)
    }

    const sendKeySolicitation = async (streamId: string, sessionIds: string[]) => {
        const encryptionDevice = client.crypto.getUserDevice()
        const missingSessionIds = sessionIds.filter((sessionId) => sessionId !== '')

        return client.sendEvent(
            streamId,
            make_MemberPayload_KeySolicitation({
                deviceKey: encryptionDevice.deviceKey,
                fallbackKey: encryptionDevice.fallbackKey,
                isNewDevice: missingSessionIds.length === 0,
                sessionIds: missingSessionIds,
            }),
        )
    }

    const uploadDeviceKeys = async () => {
        const streamId = makeUserMetadataStreamId(client.userId)
        const encryptionDevice = client.crypto.getUserDevice()

        return client.sendEvent(
            streamId,
            make_UserMetadataPayload_EncryptionDevice({
                ...encryptionDevice,
            }),
        )
    }

    const sendMessage = async (
        streamId: string,
        message: string,
        opts?: PostMessageOpts,
        tags?: PlainMessage<Tags>,
    ) => {
        const processedAttachments: Array<PlainMessage<ChannelMessage_Post_Attachment> | null> = []
        if (opts?.attachments && opts.attachments.length > 0) {
            for (const attachment of opts.attachments) {
                switch (attachment.type) {
                    case 'image': {
                        const result = await createImageAttachmentFromURL(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    case 'chunked': {
                        const result = await createChunkedMediaAttachment(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    default:
                        logNever(attachment)
                }
            }
        }

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
                            attachments: processedAttachments.filter((x) => x !== null),
                            mentions: opts?.mentions || [],
                        },
                    },
                },
            },
        })
        return sendMessageEvent({ streamId, payload, tags, ephemeral: opts?.ephemeral })
    }

    const editMessage = async (
        streamId: string,
        messageId: string,
        message: string,
        opts?: PostMessageOpts,
        tags?: PlainMessage<Tags>,
    ) => {
        const processedAttachments: Array<PlainMessage<ChannelMessage_Post_Attachment> | null> = []
        if (opts?.attachments && opts.attachments.length > 0) {
            for (const attachment of opts.attachments) {
                switch (attachment.type) {
                    case 'image': {
                        const result = await createImageAttachmentFromURL(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    case 'chunked': {
                        const result = await createChunkedMediaAttachment(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    default:
                        logNever(attachment)
                }
            }
        }
        const payload = create(ChannelMessageSchema, {
            payload: {
                case: 'edit',
                value: {
                    refEventId: messageId,
                    post: {
                        threadId: opts?.threadId,
                        replyId: opts?.replyId,
                        replyPreview: opts?.replyId ? '🙈' : undefined,
                        threadPreview: opts?.threadId ? '🙉' : undefined,
                        content: {
                            case: 'text',
                            value: {
                                body: message,
                                mentions: opts?.mentions || [],
                                attachments: processedAttachments.filter((x) => x !== null),
                            },
                        },
                    },
                },
            },
        })
        return sendMessageEvent({ streamId, payload, tags, ephemeral: opts?.ephemeral })
    }

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

    /**
     * Used to send a typed message into a channel stream.
     * The message will be serialized to JSON using superjson and then encoded to bytes.
     * Clients can agree on the schema to deserialize the message by the typeUrl.
     * @param streamId - The stream ID to send the message to.
     * @param typeUrl - A schema type URL for the message
     * @param message - The message to send as raw bytes.
     * @param tags - The tags to send with the message.
     * @returns The event ID of the sent message.
     */
    async function sendGM<Schema extends StandardSchemaV1>(
        streamId: string,
        typeUrl: string,
        schema: Schema,
        data: InferInput<Schema>,
        opts?: MessageOpts,
        tags?: PlainMessage<Tags>,
    ): ReturnType<typeof sendMessageEvent> {
        const result = await schema['~standard'].validate(data)
        if ('issues' in result && result.issues) {
            throw new Error(
                `Schema validation failed: ${result.issues.map((issue) => issue.message).join(', ')}`,
            )
        }
        const jsonString = superjsonStringify(result.value)
        const jsonBytesMessage = new TextEncoder().encode(jsonString)
        const payload = create(ChannelMessageSchema, {
            payload: {
                case: 'post',
                value: {
                    threadId: opts?.threadId,
                    replyId: opts?.replyId,
                    replyPreview: opts?.replyId ? '🙈' : undefined,
                    threadPreview: opts?.threadId ? '🙉' : undefined,
                    content: { case: 'gm', value: { typeUrl: typeUrl, value: jsonBytesMessage } },
                },
            },
        })
        return sendMessageEvent({ streamId, payload, tags, ephemeral: opts?.ephemeral })
    }

    /**
     * Used to send a custom message into a channel stream.
     * The messages will be a raw bytes.
     * Clients can agree on the schema to deserialize the message by the typeUrl.
     * @param streamId - The stream ID to send the message to.
     * @param typeUrl - A schema type URL for the message
     * @param message - The message to send as raw bytes.
     * @param tags - The tags to send with the message.
     * @returns The event ID of the sent message.
     */
    const sendRawGM = async (
        streamId: string,
        typeUrl: string,
        message: Uint8Array,
        opts?: MessageOpts,
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
                    content: { case: 'gm', value: { typeUrl: typeUrl, value: message } },
                },
            },
        })
        return sendMessageEvent({ streamId, payload, tags, ephemeral: opts?.ephemeral })
    }

    const removeEvent = async (streamId: string, messageId: string, tags?: PlainMessage<Tags>) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'redaction', value: { refEventId: messageId } },
        })
        return sendMessageEvent({ streamId, payload, tags })
    }

    const adminRemoveEvent = async (streamId: string, messageId: string) => {
        return client.sendEvent(
            streamId,
            make_ChannelPayload_Redaction(bin_fromHexString(messageId)),
            {
                participatingUserAddresses: [],
                threadId: undefined,
                messageInteractionType: MessageInteractionType.REDACTION,
                groupMentionTypes: [],
                mentionedUserAddresses: [],
            },
        )
    }

    const hasAdminPermission = async (userId: string, spaceId: string): Promise<boolean> => {
        const userAddress = userId.startsWith('0x') ? userId : `0x${userId}`
        // If you can ban, you're probably an "admin"
        return spaceDapp
            .isEntitledToSpace(spaceId, userAddress, Permission.ModifyBanning)
            .catch(() => false)
    }

    const checkPermission = async (
        streamId: string,
        userId: string,
        permission: Permission,
    ): Promise<boolean> => {
        const userAddress = userId.startsWith('0x') ? userId : `0x${userId}`
        if (isChannelStreamId(streamId)) {
            const spaceId = spaceIdFromChannelId(streamId)
            return spaceDapp
                .isEntitledToChannel(spaceId, streamId, userAddress, permission)
                .catch(() => false)
        } else {
            return spaceDapp.isEntitledToSpace(streamId, userAddress, permission).catch(() => false)
        }
    }

    /**
     * Ban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     */
    const ban = async (userId: string, spaceId: string) => {
        const tx = await spaceDapp.banWalletAddress(spaceId, userId, client.wallet)
        const receipt = await tx.wait()
        return { txHash: receipt.transactionHash }
    }

    /**
     * Unban a user from a space
     * Requires Permission.ModifyBanning to execute this action
     */
    const unban = async (userId: string, spaceId: string) => {
        const tx = await spaceDapp.unbanWalletAddress(spaceId, userId, client.wallet)
        const receipt = await tx.wait()
        return { txHash: receipt.transactionHash }
    }

    const getChannelSettings = async (channelId: string) =>
        getFromSnapshot(channelId, 'channelContent', (value) => value.inception?.channelSettings)

    type SnapshotValueForCase<TCase extends SnapshotCaseType> = Extract<
        Snapshot['content'],
        { case: TCase }
    >['value']

    const getFromSnapshot = async <TCase extends SnapshotCaseType, TResult>(
        streamId: string,
        snapshotCase: TCase,
        getValue: (value: SnapshotValueForCase<TCase>) => TResult,
    ): Promise<TResult | undefined> => {
        const stream = await client.getStream(streamId)
        if (stream.snapshot.content.case === snapshotCase) {
            return getValue(stream.snapshot.content.value as SnapshotValueForCase<TCase>)
        }
        return undefined
    }

    return {
        sendMessage,
        editMessage,
        sendReaction,
        sendGM,
        sendRawGM,
        removeEvent,
        adminRemoveEvent,
        sendKeySolicitation,
        uploadDeviceKeys,
        hasAdminPermission,
        checkPermission,
        ban,
        unban,
        getChannelSettings,
        getFromSnapshot,
        snapshot: SnapshotGetter(client.getStream),
    }
}

/**
 * Given a slash command message, returns the command and the arguments
 * @example
 * ```
 * /help
 * args: []
 * ```
 * ```
 * /sum 1 2
 * args: ['1', '2']
 * ```
 */
const parseSlashCommand = (message: string): { command: string; args: string[] } => {
    const parts = message.split(' ')
    const commandWithSlash = parts[0]
    const command = commandWithSlash.substring(1)
    const args = parts.slice(1)
    return { command, args }
}

const parseMentions = (
    mentions: PlainMessage<ChannelMessage_Post_Mention>[],
): Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[] =>
    // Bots doesn't care about @channel or @role mentions
    mentions.flatMap((m) =>
        m.mentionBehavior.case === undefined
            ? [{ userId: m.userId, displayName: m.displayName }]
            : [],
    )
