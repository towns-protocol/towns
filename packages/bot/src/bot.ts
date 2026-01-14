import { create, fromBinary, fromJsonString, toBinary } from '@bufbuild/protobuf'
import { utils, ethers } from 'ethers'
import {
    SpaceDapp,
    Permission,
    SpaceAddressFromSpaceId,
    type SendTipMemberParams,
    TipRecipientType,
    ETH_ADDRESS,
    type Operation,
    NoopOperation,
    createRuleStruct,
} from '@towns-protocol/web3'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import { stringify as superjsonStringify, parse as superjsonParse } from 'superjson'
import tippingFacetAbi from '@towns-protocol/generated/dev/abis/ITipping.abi'

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
    make_ChannelPayload_Redaction,
    parseAppPrivateData,
    makeEvent,
    make_MediaPayload_Inception,
    make_MediaPayload_Chunk,
    makeUniqueMediaStreamId,
    streamIdAsBytes,
    addressFromUserId,
    make_ChannelPayload_InteractionRequest,
    userIdToAddress,
    unpackEnvelope,
    make_UserPayload_BlockchainTransaction,
    makeUserStreamId,
    make_MemberPayload_Pin,
    make_MemberPayload_Unpin,
    makeUniqueChannelStreamId,
    make_ChannelPayload_Inception,
    make_MemberPayload_Membership2,
    type CreateTownsClientParams,
    waitForRoleCreated,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    make_DMChannelPayload_Message,
} from '@towns-protocol/sdk'
import { Hono, type Context, type Next } from 'hono'
import { logger } from 'hono/logger'
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
    ChannelMessage_Post_Content_ImageSchema,
    ChannelMessage_Post_Content_Image_InfoSchema,
    ChunkedMediaSchema,
    CreationCookieSchema,
    type BlockchainTransaction,
    BlockchainTransactionSchema,
    InteractionRequest,
    InteractionRequestPayload,
    InteractionRequestPayloadSchema,
    InteractionResponsePayload,
    InteractionResponsePayloadSchema,
    ChannelMessage_Post_AttachmentSchema,
    type AppMetadata,
    StreamEvent,
    ChannelMessage_Post_MentionSchema,
} from '@towns-protocol/proto'
import {
    bin_equal,
    bin_fromBase64,
    bin_fromHexString,
    bin_toHexString,
    check,
    dlog,
} from '@towns-protocol/utils'
import { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'
import { encryptChunkedAESGCM } from '@towns-protocol/sdk-crypto'
import { EventDedup, type EventDedupConfig } from './eventDedup'
import {
    type FlattenedInteractionRequest,
    isFlattenedRequest,
    flattenedToPayloadContent,
} from './interaction-api'
import type {
    FacilitatorConfig,
    PaymentPayload,
    PaymentRequirements,
    RouteConfig,
} from 'x402/types'
import type { PendingPayment } from './payments'
import { chainIdToNetwork, createPaymentRequest } from './payments'
import { useFacilitator } from 'x402/verify'

import {
    http,
    type Chain,
    type Transport,
    type Hex,
    type Address,
    type Account,
    type WalletClient,
    createWalletClient,
    type TransactionReceipt,
    encodeAbiParameters,
    zeroAddress,
    parseEventLogs,
    formatUnits,
    erc20Abi,
} from 'viem'
import { readContract, waitForTransactionReceipt, writeContract } from 'viem/actions'
import { base, baseSepolia, foundry } from 'viem/chains'
import packageJson from '../package.json' with { type: 'json' }
import { privateKeyToAccount } from 'viem/accounts'
import appRegistryAbi from '@towns-protocol/generated/dev/abis/IAppRegistry.abi'
import { execute } from 'viem/experimental/erc7821'
import { getSmartAccountFromUserIdImpl } from './smart-account'
import type { BotIdentityConfig, BotIdentityMetadata, ERC8004Endpoint } from './identity-types'
import channelsFacetAbi from '@towns-protocol/generated/dev/abis/Channels.abi'
import rolesFacetAbi from '@towns-protocol/generated/dev/abis/Roles.abi'
import { EmptySchema } from '@bufbuild/protobuf/wkt'

type BotActions = ReturnType<typeof buildBotActions>

export type BotCommand = PlainMessage<SlashCommand> & {
    paid?: RouteConfig
}

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
    Commands extends BotCommand[] = [],
> = Parameters<BotEvents<Commands>[T]>[1]

export type CreateRoleParams = {
    /** The role name */
    name: string
    /** The permissions that will be granted to users of this role */
    permissions: Permission[]
    /** The custom rule data. Can be used to perform onchain checks */
    rule?: Operation
    /** Users that can have this role */
    users?: string[]
}

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

type LinkAttachment = {
    type: 'link'
    url: string
    title?: string
    description?: string
    image?: {
        width: number
        height: number
        url: string
    }
}

type MiniAppAttachment = {
    type: 'miniapp'
    url: string
}

type TickerAttachment = {
    type: 'ticker'
    address: string
    chainId: string
}

export type MessageOpts = {
    threadId?: string
    replyId?: string
    ephemeral?: boolean
}

export type PostMessageOpts = MessageOpts & {
    mentions?: Array<
        { userId: string; displayName: string } | { roleId: number } | { atChannel: true }
    >
    attachments?: Array<
        | ImageAttachment
        | ChunkedMediaAttachment
        | LinkAttachment
        | TickerAttachment
        | MiniAppAttachment
    >
}

export type DecryptedInteractionResponse = {
    recipient: Uint8Array
    payload: PlainMessage<InteractionResponsePayload>
}

export type CreateChannelParams = {
    name: string
    description?: string
    autojoin?: boolean
    hideUserJoinLeaveEvents?: boolean
}

export type BotEvents<Commands extends BotCommand[] = []> = {
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
            /** Convenience flag to check if it event triggered on a DM channel*/
            isDm: boolean
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
            /** The address that sent the tip */
            senderAddress: Address
            /** The address that received the tip */
            receiverAddress: Address
            /** The user ID that received the tip */
            receiverUserId: string
            /** The amount of the tip */
            amount: bigint
            /** The currency of the tip */
            currency: Address
        },
    ) => Promise<void> | void
    channelJoin: (handler: BotActions, event: BasePayload) => Promise<void> | void
    channelLeave: (handler: BotActions, event: BasePayload) => Promise<void> | void
    streamEvent: (
        handler: BotActions,
        event: BasePayload & { parsed: ParsedEvent },
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
    interactionResponse: (
        handler: BotActions,
        event: BasePayload & {
            /** The interaction response that was received */
            response: DecryptedInteractionResponse
            threadId: string | undefined
        },
    ) => void | Promise<void>
}

export type BasePayload =
    | {
          /** The user ID of the user that triggered the event */
          userId: Address
          /** The space ID that the event was triggered in */
          spaceId: undefined
          /** channelId that the event was triggered in */
          channelId: string
          /** The ID of the event that triggered */
          eventId: string
          /** The creation time of the event */
          createdAt: Date
          /** The raw event payload */
          event: StreamEvent
          /** Convenience flag to check if the event triggered on a DM channel*/
          isDm: true
      }
    | {
          /** The user ID of the user that triggered the event */
          userId: Address
          /** The space ID that the event was triggered in */
          spaceId: string
          /** channelId that the event was triggered in */
          channelId: string
          /** The ID of the event that triggered */
          eventId: string
          /** The creation time of the event */
          createdAt: Date
          /** The raw event payload */
          event: StreamEvent
          /** Convenience flag to check if the event triggered on a DM channel*/
          isDm: false
      }

export class Bot<Commands extends BotCommand[] = []> {
    readonly client: ClientV2<BotActions>
    readonly appAddress: Address
    botId: string
    viem: WalletClient<Transport, Chain, Account>
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
    private readonly identityConfig?: BotIdentityConfig
    private readonly eventDedup: EventDedup

    // Payment related members
    private readonly paymentConfig?: FacilitatorConfig
    private readonly pendingPayments: Map<string, PendingPayment> = new Map()
    private readonly paymentCommands = new Map<string, RouteConfig>()

    constructor(
        clientV2: ClientV2<BotActions>,
        viem: WalletClient<Transport, Chain, Account>,
        jwtSecretBase64: string,
        appAddress: Address,
        commands?: Commands,
        identityConfig?: BotIdentityConfig,
        dedupConfig?: EventDedupConfig,
        paymentConfig?: FacilitatorConfig,
    ) {
        this.client = clientV2
        this.botId = clientV2.userId
        this.viem = viem
        this.jwtSecret = bin_fromBase64(jwtSecretBase64)
        this.currentMessageTags = undefined
        this.commands = commands
        this.appAddress = appAddress
        this.identityConfig = identityConfig
        this.eventDedup = new EventDedup(dedupConfig)
        this.paymentConfig = paymentConfig

        if (commands && paymentConfig) {
            for (const cmd of commands) {
                if (cmd.paid?.price) {
                    this.paymentCommands.set(cmd.name, cmd.paid)
                }
            }
        }

        this.onInteractionResponse(this.handlePaymentResponse.bind(this))
    }

    start() {
        const jwtMiddleware = createMiddleware(this.jwtMiddleware.bind(this))
        const handler = this.webhookHandler.bind(this)
        const app = new Hono()
        app.use(logger())
        app.post('/webhook', jwtMiddleware, handler)
        app.get('/.well-known/agent-metadata.json', async (c) => {
            return c.json(await this.getIdentityMetadata())
        })
        debug('init')
        return app
    }

    private async jwtMiddleware(c: Context, next: Next): Promise<Response | void> {
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

    private async webhookHandler(c: Context) {
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
                try {
                    await this.handleEvent(event)
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('[@towns-protocol/bot] Error while handling event', err)
                }
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
                // Skip duplicate events (App Registry may replay events during restarts)
                if (this.eventDedup.checkAndAdd(streamId, parsed.hashStr)) {
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
                    ...createBasePayload(
                        userIdFromAddress(parsed.event.creatorAddress),
                        streamId,
                        parsed.hashStr,
                        createdAt,
                        parsed.event,
                    ),
                    parsed: parsed,
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
                                ...createBasePayload(
                                    userIdFromAddress(parsed.event.creatorAddress),
                                    streamId,
                                    parsed.hashStr,
                                    createdAt,
                                    parsed.event,
                                ),
                                refEventId,
                            })
                        } else if (
                            parsed.event.payload.value.content.case === 'channelProperties'
                        ) {
                            // TODO: currently, no support for channel properties (update name, topic)
                        } else if (parsed.event.payload.value.content.case === 'inception') {
                            // TODO: is there any use case for this?
                        } else if (parsed.event.payload.value.content.case === 'custom') {
                            // TODO: what to do with custom payload for bot?
                        } else if (
                            parsed.event.payload.value.content.case === 'interactionRequest'
                        ) {
                            // ignored for bots
                        } else if (
                            parsed.event.payload.value.content.case === 'interactionResponse'
                        ) {
                            const payload = parsed.event.payload.value.content.value
                            if (!bin_equal(payload.recipient, bin_fromHexString(this.botId))) {
                                continue
                            }
                            if (!payload.encryptedData) {
                                continue
                            }
                            if (
                                payload.encryptedData.deviceKey !== this.getUserDevice().deviceKey
                            ) {
                                continue
                            }
                            const decryptedBase64 = await this.client.crypto.decryptWithDeviceKey(
                                payload.encryptedData.ciphertext,
                                payload.encryptedData.senderKey,
                            )
                            const decrypted = bin_fromBase64(decryptedBase64)
                            const response = fromBinary(InteractionResponsePayloadSchema, decrypted)
                            this.emitter.emit('interactionResponse', this.client, {
                                ...createBasePayload(
                                    userIdFromAddress(parsed.event.creatorAddress),
                                    streamId,
                                    parsed.hashStr,
                                    createdAt,
                                    parsed.event,
                                ),
                                response: {
                                    recipient: payload.recipient,
                                    payload: response,
                                },
                                threadId: payload.threadId
                                    ? bin_toHexString(payload.threadId)
                                    : undefined,
                            })
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
                                            ...createBasePayload(
                                                userIdFromAddress(membership.userAddress),
                                                streamId,
                                                parsed.hashStr,
                                                createdAt,
                                                parsed.event,
                                            ),
                                        })
                                    }
                                    if (membership.op === MembershipOp.SO_LEAVE) {
                                        debug('emit:channelLeave', {
                                            userId: userIdFromAddress(membership.userAddress),
                                            channelId: streamId,
                                            eventId: parsed.hashStr,
                                        })
                                        this.emitter.emit('channelLeave', this.client, {
                                            ...createBasePayload(
                                                userIdFromAddress(membership.userAddress),
                                                streamId,
                                                parsed.hashStr,
                                                createdAt,
                                                parsed.event,
                                            ),
                                        })
                                    }
                                }
                                break

                            case 'memberBlockchainTransaction':
                                {
                                    const transactionContent =
                                        parsed.event.payload.value.content.value.transaction
                                            ?.content
                                    const fromUserAddress =
                                        parsed.event.payload.value.content.value.fromUserAddress

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
                                                const senderAddress = utils.getAddress(
                                                    bin_toHexString(tipEvent.sender),
                                                ) as Address
                                                const receiverAddress = utils.getAddress(
                                                    bin_toHexString(tipEvent.receiver),
                                                ) as Address
                                                const senderUserId =
                                                    userIdFromAddress(fromUserAddress)
                                                const receiverUserId = userIdFromAddress(
                                                    transactionContent.value.toUserAddress,
                                                )
                                                debug('emit:tip', {
                                                    senderAddress,
                                                    senderUserId,
                                                    receiverAddress,
                                                    receiverUserId,
                                                    amount: tipEvent.amount.toString(),
                                                    currency,
                                                    messageId: bin_toHexString(tipEvent.messageId),
                                                })
                                                this.emitter.emit('tip', this.client, {
                                                    ...createBasePayload(
                                                        senderUserId,
                                                        streamId,
                                                        parsed.hashStr,
                                                        createdAt,
                                                        parsed.event,
                                                    ),
                                                    amount: tipEvent.amount,
                                                    currency: currency as `0x${string}`,
                                                    senderAddress,
                                                    receiverAddress,
                                                    receiverUserId,
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

    private async handleChannelMessage(
        streamId: string,
        parsed: ParsedEvent,
        { payload }: ChannelMessage,
    ) {
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
                        ...createBasePayload(
                            userId,
                            streamId,
                            parsed.hashStr,
                            createdAt,
                            parsed.event,
                        ),
                        message: payload.value.content.value.body,
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
                        ...createBasePayload(
                            userId,
                            streamId,
                            parsed.hashStr,
                            createdAt,
                            parsed.event,
                        ),
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
                                    ...createBasePayload(
                                        userId,
                                        streamId,
                                        parsed.hashStr,
                                        createdAt,
                                        parsed.event,
                                    ),
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
                    ...createBasePayload(
                        userIdFromAddress(parsed.event.creatorAddress),
                        streamId,
                        parsed.hashStr,
                        createdAt,
                        parsed.event,
                    ),
                    reaction: payload.value.reaction,
                    messageId: payload.value.refEventId,
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
                    ...createBasePayload(
                        userIdFromAddress(parsed.event.creatorAddress),
                        streamId,
                        parsed.hashStr,
                        createdAt,
                        parsed.event,
                    ),
                    refEventId: payload.value.refEventId,
                    message: payload.value.post?.content.value.body,
                    mentions,
                    isMentioned,
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
                    ...createBasePayload(
                        userIdFromAddress(parsed.event.creatorAddress),
                        streamId,
                        parsed.hashStr,
                        createdAt,
                        parsed.event,
                    ),
                    refEventId: payload.value.refEventId,
                })
                break
            }
            default:
                logNever(payload)
        }
    }

    private async handlePaymentResponse(
        handler: BotActions,
        event: BasePayload & {
            response: DecryptedInteractionResponse
            threadId: string | undefined
        },
    ) {
        if (!this.paymentConfig) return
        const { response, channelId } = event

        // Check if this is a signature response
        if (response.payload?.content?.case !== 'signature') {
            return
        }

        const signatureId = response.payload.content.value?.requestId ?? ''
        const signature = (response.payload.content.value?.signature ?? '') as Hex

        if (!signatureId || !signature) {
            return
        }

        // Check if this is a pending payment
        const pending = this.pendingPayments.get(signatureId)
        if (!pending) {
            return // Not a payment signature
        }

        // Remove from pending
        this.pendingPayments.delete(signatureId)

        const facilitator = useFacilitator(this.paymentConfig)

        // Build PaymentPayload for x402
        const paymentPayload: PaymentPayload = {
            x402Version: 1,
            scheme: 'exact',
            network: chainIdToNetwork(this.viem.chain.id),
            payload: {
                signature: signature,
                authorization: {
                    from: pending.params.from,
                    to: pending.params.to,
                    value: pending.params.value.toString(),
                    validAfter: pending.params.validAfter.toString(),
                    validBefore: pending.params.validBefore.toString(),
                    nonce: pending.params.nonce,
                },
            },
        }

        // Build PaymentRequirements for x402
        const paymentRequirements: PaymentRequirements = {
            scheme: 'exact',
            network: paymentPayload.network,
            maxAmountRequired: pending.params.value.toString(),
            resource: `https://towns.com/command/${pending.command}`,
            description: `Payment for /${pending.command}`,
            mimeType: 'application/json',
            payTo: pending.params.to,
            maxTimeoutSeconds: 300,
            asset: pending.params.verifyingContract,
        }

        // Single status message that gets updated through the flow
        const statusMsg = await handler.sendMessage(channelId, '🔍 Verifying payment...')

        // Track settlement state to distinguish payment failures from post-payment failures
        let settlementCompleted = false
        let transactionHash: string | undefined

        try {
            const verifyResult = await facilitator.verify(paymentPayload, paymentRequirements)

            if (!verifyResult.isValid) {
                await handler.editMessage(
                    channelId,
                    statusMsg.eventId,
                    `❌ Payment verification failed: ${verifyResult.invalidReason || 'Unknown error'}`,
                )
                await handler.removeEvent(channelId, pending.interactionEventId)
                return
            }

            // Update status: settling
            await handler.editMessage(
                channelId,
                statusMsg.eventId,
                `✅ Verified • Settling $${formatUnits(pending.params.value, 6)} USDC...`,
            )

            const settleResult = await facilitator.settle(paymentPayload, paymentRequirements)

            if (!settleResult.success) {
                await handler.editMessage(
                    channelId,
                    statusMsg.eventId,
                    `❌ Settlement failed: ${settleResult.errorReason || 'Unknown error'}`,
                )
                await handler.removeEvent(channelId, pending.interactionEventId)
                return
            }

            // Mark settlement as complete - funds have been transferred
            settlementCompleted = true
            transactionHash = settleResult.transaction

            // Final success - show receipt
            await handler.editMessage(
                channelId,
                statusMsg.eventId,
                `✅ **Payment Complete**\n` +
                    `/${pending.command} • $${formatUnits(pending.params.value, 6)} USDC\n` +
                    `Tx: \`${transactionHash}\``,
            )

            // Delete the signature request now that payment is complete
            await handler.removeEvent(channelId, pending.interactionEventId)

            // Execute the original command handler (stored with __paid_ prefix)
            const actualHandlerKey = `__paid_${pending.command}`
            const originalHandler = this.slashCommandHandlers.get(actualHandlerKey)
            if (originalHandler) {
                await originalHandler(this.client, pending.event)
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error'

            if (settlementCompleted) {
                // Payment succeeded but command handler failed - DO NOT suggest retry
                await handler.editMessage(
                    channelId,
                    statusMsg.eventId,
                    `⚠️ **Payment succeeded but command failed**\n` +
                        `Your payment of $${formatUnits(pending.params.value, 6)} USDC was processed.\n` +
                        `Tx: \`${transactionHash}\`\n\n` +
                        `Error: ${errorMessage}\n` +
                        `Please contact support - do NOT retry to avoid double charges.`,
                )
                // Don't remove interaction event - payment already processed
            } else {
                // Actual payment failure (verify or settle threw)
                await handler.editMessage(
                    channelId,
                    statusMsg.eventId,
                    `❌ Payment failed: ${errorMessage}`,
                )
                await handler.removeEvent(channelId, pending.interactionEventId)
            }
        }
    }

    /**
     * get the public device key of the bot
     * @returns the public device key of the bot
     */
    getUserDevice() {
        return this.client.crypto.getUserDevice()
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

    /**
     * Send an interaction request to a stream
     * @param streamId - Id of the stream. Usually channelId or userId
     * @param contentOrPayload - The interaction request content (old format) or flattened payload (new format)
     * @param recipientOrOpts - Recipient bytes (old format) or message options (new format)
     * @param opts - The options for the interaction request (old format only)
     * @returns The eventId of the interaction request
     */
    // Overload 1: Old format (backward compatible)
    async sendInteractionRequest(
        streamId: string,
        content: PlainMessage<InteractionRequestPayload['content']>,
        recipient?: Uint8Array,
        opts?: MessageOpts,
    ): Promise<{ eventId: string }>
    // Overload 2: New flattened format (recipient inside payload)
    async sendInteractionRequest(
        streamId: string,
        payload: FlattenedInteractionRequest,
        opts?: MessageOpts,
    ): Promise<{ eventId: string }>
    // Implementation
    async sendInteractionRequest(
        streamId: string,
        contentOrPayload:
            | PlainMessage<InteractionRequestPayload['content']>
            | FlattenedInteractionRequest,
        recipientOrOpts?: Uint8Array | MessageOpts,
        maybeOpts?: MessageOpts,
    ): Promise<{ eventId: string }> {
        const tags = this.currentMessageTags
        this.currentMessageTags = undefined

        if (isFlattenedRequest(contentOrPayload)) {
            // New flattened format: (streamId, payload, opts?)
            return this.client.sendInteractionRequest(
                streamId,
                contentOrPayload,
                recipientOrOpts as MessageOpts | undefined,
                tags,
            )
        } else {
            // Old format: (streamId, content, recipient?, opts?)
            return this.client.sendInteractionRequest(
                streamId,
                contentOrPayload,
                recipientOrOpts as Uint8Array | undefined,
                maybeOpts,
                tags,
            )
        }
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

    /** Sends a tip to a user by looking up their smart account.
     *  Tip will always get funds from the app account balance.
     * @param params - Tip parameters including userId, amount, messageId, channelId, currency.
     * @returns The transaction hash and event ID
     */
    async sendTip(
        params: Omit<SendTipMemberParams, 'spaceId' | 'tokenId' | 'currency' | 'receiver'> & {
            currency?: Address
            userId: Address
        },
    ) {
        const result = await this.client.sendTip(params, this.currentMessageTags)
        this.currentMessageTags = undefined
        return result
    }

    async pinMessage(streamId: string, eventId: string, streamEvent: StreamEvent) {
        return this.client.pinMessage(streamId, eventId, streamEvent)
    }

    async unpinMessage(streamId: string, eventId: string) {
        return this.client.unpinMessage(streamId, eventId)
    }

    /**
     * Create a channel in a space
     * All users with Permission.Read will be able to join the channel.
     * @param spaceId - The space ID to create the channel in
     * @param params - The parameters for the channel creation
     * @returns The channel ID
     */
    async createChannel(spaceId: string, params: CreateChannelParams) {
        return this.client.createChannel(spaceId, params)
    }

    /**
     * Get all roles for a space
     * @param spaceId - The space ID to get the roles for
     * @returns Array of roles with id, name, permissions, and disabled status
     */
    async getAllRoles(spaceId: string) {
        return this.client.getAllRoles(spaceId)
    }

    /**
     * Create a role in a space
     * @param spaceId - The space ID
     * @param params - Role parameters (name, permissions, optional rule, optional users)
     * @returns The created role ID
     */
    async createRole(spaceId: string, params: CreateRoleParams) {
        return this.client.createRole(spaceId, params)
    }

    /**
     * Update an existing role
     * @param spaceId - The space ID
     * @param roleId - The role ID to update
     * @param params - Updated role parameters
     */
    async updateRole(spaceId: string, roleId: number, params: CreateRoleParams) {
        return this.client.updateRole(spaceId, roleId, params)
    }

    /**
     * Add a role to a channel
     * @param channelId - The channel ID
     * @param roleId - The role ID to add
     */
    async addRoleToChannel(channelId: string, roleId: number) {
        return this.client.addRoleToChannel(channelId, roleId)
    }

    /**
     * Delete a role from a space
     * @param spaceId - The space ID
     * @param roleId - The role ID to delete
     */
    async deleteRole(spaceId: string, roleId: number) {
        return this.client.deleteRole(spaceId, roleId)
    }

    /**
     * Get full details of a specific role
     * @param spaceId - The space ID
     * @param roleId - The role ID
     * @returns Role details including name, permissions, rule data, and users
     */
    async getRole(spaceId: string, roleId: number) {
        return this.client.getRole(spaceId, roleId)
    }

    /**
     * Triggered when someone sends a message.
     * This is triggered for all messages, including direct messages and group messages.
     */
    onMessage(fn: BotEvents['message']) {
        return this.emitter.on('message', fn)
    }

    onRedaction(fn: BotEvents['redaction']) {
        return this.emitter.on('redaction', fn)
    }

    /**
     * Triggered when a message gets edited
     */
    onMessageEdit(fn: BotEvents['messageEdit']) {
        return this.emitter.on('messageEdit', fn)
    }

    /**
     * Triggered when someone reacts to a message
     */
    onReaction(fn: BotEvents['reaction']) {
        return this.emitter.on('reaction', fn)
    }

    /**
     * Triggered when a message is revoked by a moderator
     */
    onEventRevoke(fn: BotEvents['eventRevoke']) {
        return this.emitter.on('eventRevoke', fn)
    }

    /**
     * Triggered when someone tips the bot
     */
    onTip(fn: BotEvents['tip']) {
        return this.emitter.on('tip', fn)
    }

    /**
     * Triggered when someone joins a channel
     */
    onChannelJoin(fn: BotEvents['channelJoin']) {
        return this.emitter.on('channelJoin', fn)
    }

    /**
     * Triggered when someone leaves a channel
     */
    onChannelLeave(fn: BotEvents['channelLeave']) {
        return this.emitter.on('channelLeave', fn)
    }

    onStreamEvent(fn: BotEvents['streamEvent']) {
        return this.emitter.on('streamEvent', fn)
    }

    onSlashCommand(command: Commands[number]['name'], fn: BotEvents<Commands>['slashCommand']) {
        const paymentConfig = this.paymentCommands.get(command)
        if (!paymentConfig || !this.paymentConfig) {
            this.slashCommandHandlers.set(command, fn)
            const unset = () => {
                if (
                    this.slashCommandHandlers.has(command) &&
                    this.slashCommandHandlers.get(command) === fn
                ) {
                    this.slashCommandHandlers.delete(command)
                }
            }
            return unset
        }

        this.slashCommandHandlers.set(command, async (handler, event) => {
            try {
                const chainId = this.viem.chain.id
                const smartAccountAddress = await getSmartAccountFromUserIdImpl(
                    this.client.config.base.chainConfig.addresses.spaceFactory,
                    this.viem,
                    event.userId,
                )

                const { signatureId, params, eventId } = await createPaymentRequest(
                    handler,
                    event,
                    chainId,
                    smartAccountAddress as Address,
                    this.appAddress,
                    paymentConfig,
                    command,
                )

                // Store pending payment
                this.pendingPayments.set(signatureId, {
                    command: command,
                    channelId: event.channelId,
                    userId: event.userId,
                    interactionEventId: eventId,
                    event: event,
                    params: params,
                })
            } catch (error) {
                await handler.sendMessage(
                    event.channelId,
                    `❌ Failed to request payment: ${error instanceof Error ? error.message : 'Unknown error'}`,
                )
            }
        })

        const actualHandlerKey = `__paid_${command}`
        this.slashCommandHandlers.set(actualHandlerKey, fn)

        const unset = () => {
            if (
                this.slashCommandHandlers.has(command) &&
                this.slashCommandHandlers.get(command) === fn
            ) {
                this.slashCommandHandlers.delete(command)
            }
        }
        return unset
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
        const unset = () => {
            if (
                this.gmTypedHandlers.has(typeUrl) &&
                this.gmTypedHandlers.get(typeUrl)?.handler === handler
            ) {
                this.gmTypedHandlers.delete(typeUrl)
            }
        }
        return unset
    }

    onRawGmMessage(handler: BotEvents['rawGmMessage']) {
        return this.emitter.on('rawGmMessage', handler)
    }

    /**
     * Triggered when someone sends an interaction response
     * @param fn - The handler function to call when an interaction response is received
     */
    onInteractionResponse(fn: BotEvents['interactionResponse']) {
        return this.emitter.on('interactionResponse', fn)
    }

    /**
     * Get the stream view for a stream
     * Stream views contain contextual information about the stream (space, channel, etc)
     * Stream views contain member data for all streams - you can iterate over all members in a channel via: `streamView.getMembers().joined.keys()`
     * note: potentially expensive operation because streams can be large, fine to use in small streams
     * @param streamId - The stream ID to get the view for
     * @returns The stream view
     */
    async getStreamView(streamId: string) {
        return this.client.getStream(streamId)
    }

    /**
     * Get the ERC-8004 compliant metadata JSON
     * This should be hosted at /.well-known/agent-metadata.json
     * Fetches metadata from the App Registry and merges with local config
     * @returns The ERC-8004 compliant metadata object or null
     */
    async getIdentityMetadata(): Promise<BotIdentityMetadata | null> {
        // Fetch metadata from App Registry
        let appMetadata: PlainMessage<AppMetadata> | undefined
        try {
            const appRegistry = await this.client.appServiceClient()
            const response = await appRegistry.getAppMetadata({
                appId: bin_fromHexString(this.botId),
            })

            appMetadata = response.metadata
        } catch (err) {
            // eslint-disable-next-line no-console
            console.warn('[@towns-protocol/bot] Failed to fetch app metadata', err)
        }

        // If no config and no fetched metadata, return null
        if (!this.identityConfig && !appMetadata) return null

        const endpoints: ERC8004Endpoint[] = []

        if (this.identityConfig?.endpoints) {
            endpoints.push(...this.identityConfig.endpoints)
        }

        const hasAgentWallet = endpoints.some((e) => e.name === 'agentWallet')
        if (!hasAgentWallet) {
            const chainId = this.viem.chain.id
            endpoints.push({
                name: 'agentWallet',
                endpoint: `eip155:${chainId}:${this.appAddress}`,
            })
        }

        const domain = this.identityConfig?.domain
        if (domain && !endpoints.some((e) => e.name === 'A2A')) {
            const origin = domain.startsWith('http') ? domain : `https://${domain}`

            endpoints.push({
                name: 'A2A',
                endpoint: `${origin}/.well-known/agent-card.json`,
                version: '0.3.0',
            })
        }

        // Merge app metadata with identity config, preferring identity config
        const name = this.identityConfig?.name || appMetadata?.displayName || 'Unknown Bot'
        const description = this.identityConfig?.description || appMetadata?.description || ''
        const image =
            this.identityConfig?.image || appMetadata?.avatarUrl || appMetadata?.imageUrl || ''
        const motto = this.identityConfig?.motto || appMetadata?.motto

        return {
            type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
            name,
            description,
            image,
            endpoints,
            registrations: this.identityConfig?.registrations || [],
            supportedTrust: this.identityConfig?.supportedTrust,
            motto,
            capabilities: this.commands?.map((c) => c.name) || [],
            version: packageJson.version,
            framework: `javascript:${packageJson.name}:${packageJson.version}`,
            attributes: this.identityConfig?.attributes,
        }
    }

    /**
     * Get the tokenURI that would be used for ERC-8004 registration
     * Returns null if no domain is configured
     * @returns The .well-known URL or null
     */
    getTokenURI(): string | null {
        if (!this.identityConfig?.domain) return null

        const origin = this.identityConfig.domain.startsWith('http')
            ? this.identityConfig.domain
            : `https://${this.identityConfig.domain}`

        return `${origin}/.well-known/agent-metadata.json`
    }
}

export const makeTownsBot = async <Commands extends BotCommand[] = []>(
    appPrivateData: string,
    jwtSecretBase64: string,
    opts: {
        baseRpcUrl?: string
        commands?: Commands
        identity?: BotIdentityConfig
        dedup?: EventDedupConfig
        paymentConfig?: FacilitatorConfig
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

    if (opts.commands) {
        client
            .appServiceClient()
            .then((appRegistryClient) =>
                appRegistryClient
                    .updateAppMetadata({
                        appId: bin_fromHexString(account.address),
                        updateMask: ['slash_commands'],
                        metadata: {
                            slashCommands: opts.commands,
                        },
                    })
                    .catch((err) => {
                        // eslint-disable-next-line no-console
                        console.warn('[@towns-protocol/bot] failed to update slash commands', err)
                    }),
            )
            .catch((err) => {
                // eslint-disable-next-line no-console
                console.warn('[@towns-protocol/bot] failed to get app registry rpc client', err)
            })
    }

    await client.uploadDeviceKeys()
    return new Bot<Commands>(
        client,
        viem,
        jwtSecretBase64,
        appAddress,
        opts.commands,
        opts.identity,
        opts.dedup,
        opts.paymentConfig,
    )
}

const buildBotActions = (
    client: ClientV2,
    viem: WalletClient<Transport, Chain, Account>,
    spaceDapp: SpaceDapp,
    appAddress: Address,
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

    const createLinkAttachment = (
        attachment: LinkAttachment,
    ): PlainMessage<ChannelMessage_Post_Attachment> => {
        return create(ChannelMessage_Post_AttachmentSchema, {
            content: {
                case: 'unfurledUrl',
                value: {
                    url: attachment.url,
                    image: attachment.image,
                    title: attachment.title ?? '',
                    description: attachment.description ?? '',
                },
            },
        })
    }

    const createTickerAttachment = (
        attachment: TickerAttachment,
    ): PlainMessage<ChannelMessage_Post_Attachment> => {
        return create(ChannelMessage_Post_AttachmentSchema, {
            content: {
                case: 'ticker',
                value: {
                    address: attachment.address,
                    chainId: attachment.chainId,
                },
            },
        })
    }

    const createMiniAppAttachment = (
        attachment: MiniAppAttachment,
    ): PlainMessage<ChannelMessage_Post_Attachment> => {
        return create(ChannelMessage_Post_AttachmentSchema, {
            content: {
                case: 'miniapp',
                value: { url: attachment.url },
            },
        })
    }

    const ensureOutboundSession = async (
        streamId: string,
        encryptionAlgorithm: GroupEncryptionAlgorithmId,
        toUserIds: string[],
        miniblockInfo: { miniblockNum: bigint; miniblockHash: Uint8Array },
    ) => {
        if (!(await client.crypto.hasOutboundSession(streamId, encryptionAlgorithm))) {
            // ATTEMPT 1: Get session from app service
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
                    // EARLY RETURN
                    return
                }
            } catch {
                // ignore error (should log)
            }
            // ATTEMPT 2: Create new session
            await client.crypto.ensureOutboundSession(streamId, encryptionAlgorithm, {
                shareShareSessionTimeoutMs: 5000,
                priorityUserIds: [client.userId, ...toUserIds],
                miniblockInfo,
            })
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

        await ensureOutboundSession(
            streamId,
            encryptionAlgorithm,
            Array.from(
                new Set([
                    ...eventTags.participatingUserAddresses.map((x) => userIdFromAddress(x)),
                    ...eventTags.mentionedUserAddresses.map((x) => userIdFromAddress(x)),
                ]),
            ),
            miniblockInfo,
        )

        const message = await client.crypto.encryptGroupEvent(
            streamId,
            toBinary(ChannelMessageSchema, payload),
            encryptionAlgorithm,
        )
        message.refEventId = getRefEventIdFromChannelMessage(payload)

        let eventPayload: PlainMessage<StreamEvent>['payload']
        if (isChannelStreamId(streamId)) {
            eventPayload = make_ChannelPayload_Message(message)
        } else if (isDMChannelStreamId(streamId)) {
            eventPayload = make_DMChannelPayload_Message(message)
        } else {
            throw new Error(
                `Invalid stream ID type: ${streamId} - only channel and DM streams are supported`,
            )
        }
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
                    case 'link': {
                        const result = createLinkAttachment(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    case 'ticker': {
                        const result = createTickerAttachment(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    case 'miniapp': {
                        const result = createMiniAppAttachment(attachment)
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
                            mentions: processMentions(opts?.mentions),
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
                    case 'link': {
                        const result = createLinkAttachment(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    case 'ticker': {
                        const result = createTickerAttachment(attachment)
                        processedAttachments.push(result)
                        break
                    }
                    case 'miniapp': {
                        const result = createMiniAppAttachment(attachment)
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
                                mentions: processMentions(opts?.mentions),
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

    /**
     * Pin a message to a stream
     * @param streamId - The stream ID to pin the message to
     * @param eventId - The event ID of the message to pin
     * @param streamEvent - The stream event to pin
     * @returns The event ID of the pinned message
     */
    const pinMessage = async (streamId: string, eventId: string, streamEvent: StreamEvent) => {
        return client.sendEvent(
            streamId,
            make_MemberPayload_Pin(bin_fromHexString(eventId), streamEvent),
        )
    }

    /**
     * Unpin a message from a stream
     * @param streamId - The stream ID to unpin the message from
     * @param eventId - The event ID of the message to unpin
     * @returns The event ID of the unpinned message
     */
    const unpinMessage = async (streamId: string, eventId: string) => {
        return client.sendEvent(streamId, make_MemberPayload_Unpin(bin_fromHexString(eventId)))
    }

    const getChannelSettings = async (channelId: string) => {
        const spaceId = spaceIdFromChannelId(channelId)
        const streamView = await client.getStream(spaceId)
        const channel = streamView.spaceContent.spaceChannelsMetadata[channelId]
        return channel
    }

    // Overload 1: Old format (backward compatible)
    async function sendInteractionRequest(
        streamId: string,
        content: PlainMessage<InteractionRequestPayload['content']>,
        recipient?: Uint8Array,
        opts?: MessageOpts,
        tags?: PlainMessage<Tags>,
    ): Promise<{ eventId: string }>
    // Overload 2: New flattened format (recipient inside payload)
    async function sendInteractionRequest(
        streamId: string,
        payload: FlattenedInteractionRequest,
        opts?: MessageOpts,
        tags?: PlainMessage<Tags>,
    ): Promise<{ eventId: string }>
    // Implementation
    async function sendInteractionRequest(
        streamId: string,
        contentOrPayload:
            | PlainMessage<InteractionRequestPayload['content']>
            | FlattenedInteractionRequest,
        recipientOrOpts?: Uint8Array | MessageOpts,
        optsOrTags?: MessageOpts | PlainMessage<Tags>,
        maybeTags?: PlainMessage<Tags>,
    ): Promise<{ eventId: string }> {
        // Detect which format is being used
        let content: PlainMessage<InteractionRequestPayload['content']>
        let recipient: Uint8Array | undefined
        let opts: MessageOpts | undefined
        let tags: PlainMessage<Tags> | undefined

        if (isFlattenedRequest(contentOrPayload)) {
            // New flattened format
            content = flattenedToPayloadContent(contentOrPayload)
            recipient = contentOrPayload.recipient
                ? bin_fromHexString(contentOrPayload.recipient)
                : undefined
            opts = recipientOrOpts as MessageOpts | undefined
            tags = optsOrTags as PlainMessage<Tags> | undefined
        } else {
            // Old format
            content = contentOrPayload
            recipient = recipientOrOpts as Uint8Array | undefined
            opts = optsOrTags as MessageOpts | undefined
            tags = maybeTags
        }

        // Get encryption settings (same as sendMessageEvent)
        const miniblockInfo = await client.getMiniblockInfo(streamId)
        const encryptionAlgorithm = miniblockInfo.encryptionAlgorithm?.algorithm
            ? (miniblockInfo.encryptionAlgorithm.algorithm as GroupEncryptionAlgorithmId)
            : client.defaultGroupEncryptionAlgorithm

        await ensureOutboundSession(
            streamId,
            encryptionAlgorithm,
            recipient ? [userIdFromAddress(recipient)] : [],
            miniblockInfo,
        )

        // Create payload with content and encryption device for response
        const payload = create(InteractionRequestPayloadSchema, {
            encryptionDevice: client.crypto.getUserDevice(),
            content: content,
        })

        // Encrypt using group encryption (same as messages)
        const encryptedData = await client.crypto.encryptGroupEvent(
            streamId,
            toBinary(InteractionRequestPayloadSchema, payload),
            encryptionAlgorithm,
        )

        // Create the request matching InteractionResponse structure
        const request: PlainMessage<InteractionRequest> = {
            recipient: recipient,
            encryptedData: encryptedData,
            threadId: opts?.threadId ? bin_fromHexString(opts.threadId) : undefined,
        }

        // Send as InteractionRequest
        const eventPayload = make_ChannelPayload_InteractionRequest(request)
        return client.sendEvent(streamId, eventPayload, tags, opts?.ephemeral)
    }
    /**
     * Send a blockchain transaction to the stream
     * @param streamId - The stream ID to send the transaction to
     * @param chainId - The chain ID where the transaction occurred
     * @param receipt - The transaction receipt from the blockchain
     * @param content - The transaction content (tip, transfer, etc.)
     * @returns The transaction hash and event ID
     */
    const sendBlockchainTransaction = async (
        chainId: number,
        receipt: TransactionReceipt,
        content?: PlainMessage<BlockchainTransaction>['content'],
        tags?: PlainMessage<Tags>,
    ): Promise<{ txHash: string; eventId: string }> => {
        const transaction = create(BlockchainTransactionSchema, {
            receipt: {
                chainId: BigInt(chainId),
                transactionHash: bin_fromHexString(receipt.transactionHash),
                blockNumber: receipt.blockNumber,
                to: bin_fromHexString(receipt.to || zeroAddress),
                from: bin_fromHexString(receipt.from),
                logs: receipt.logs.map((log) => ({
                    address: bin_fromHexString(log.address),
                    topics: log.topics.map((topic) => bin_fromHexString(topic)),
                    data: bin_fromHexString(log.data),
                })),
            },
            solanaReceipt: undefined,
            content: content ?? { case: undefined },
        })

        const result = await client.sendEvent(
            makeUserStreamId(client.userId),
            make_UserPayload_BlockchainTransaction(transaction),
            tags,
        )
        return { txHash: receipt.transactionHash, eventId: result.eventId }
    }

    /** Sends a tip to a user.
     *  Tip will always get funds from the app account balance.
     * @param params - Tip parameters including recipient, amount, messageId, channelId, currency.
     * @returns The transaction hash and event ID
     */
    const sendTipImpl = async (
        params: Omit<SendTipMemberParams, 'spaceId' | 'tokenId' | 'currency'> & {
            currency?: Address
            receiverUserId: string
        },
        tags?: PlainMessage<Tags>,
    ): Promise<{ txHash: string; eventId: string }> => {
        const currency = params.currency ?? ETH_ADDRESS
        const isEth = currency === ETH_ADDRESS
        const { receiver, amount, messageId, channelId } = params
        const isDm = isDMChannelStreamId(channelId)

        const accountModulesAddress = client.config.base.chainConfig.addresses.accountModules
        if (isDm && !accountModulesAddress) {
            throw new Error('AccountModules address is not configured for DM tips')
        }

        let recipientType: TipRecipientType
        let encodedData: `0x${string}`
        let targetContract: Address
        let tokenId: string | undefined

        if (isDm) {
            // DM tips use AnyTipParams sent to AccountModules contract
            recipientType = TipRecipientType.Any
            const sender = appAddress // msg.sender when contract executes

            const data = encodeAbiParameters(
                [{ type: 'bytes32' }, { type: 'bytes32' }],
                [`0x${messageId}`, `0x${channelId}`],
            )

            encodedData = encodeAbiParameters(
                [
                    {
                        type: 'tuple',
                        components: [
                            { name: 'currency', type: 'address' },
                            { name: 'sender', type: 'address' },
                            { name: 'receiver', type: 'address' },
                            { name: 'amount', type: 'uint256' },
                            { name: 'data', type: 'bytes' },
                        ],
                    },
                ],
                [
                    {
                        currency,
                        sender,
                        receiver,
                        amount,
                        data,
                    },
                ],
            )
            targetContract = accountModulesAddress!
            tokenId = undefined
        } else {
            // Member tips use MembershipTipParams sent to Space contract
            recipientType = TipRecipientType.Member
            const spaceId = spaceIdFromChannelId(channelId)
            tokenId = await spaceDapp.getTokenIdOfOwner(spaceId, receiver)
            if (!tokenId) {
                throw new Error(`No token ID found for user ${receiver} in space ${spaceId}`)
            }

            const metadataData = encodeAbiParameters(
                [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'uint256' }],
                [`0x${messageId}`, `0x${channelId}`, BigInt(tokenId)],
            )

            encodedData = encodeAbiParameters(
                [
                    {
                        type: 'tuple',
                        components: [
                            { name: 'receiver', type: 'address' },
                            { name: 'tokenId', type: 'uint256' },
                            { name: 'currency', type: 'address' },
                            { name: 'amount', type: 'uint256' },
                            {
                                name: 'metadata',
                                type: 'tuple',
                                components: [
                                    { name: 'messageId', type: 'bytes32' },
                                    { name: 'channelId', type: 'bytes32' },
                                    { name: 'data', type: 'bytes' },
                                ],
                            },
                        ],
                    },
                ],
                [
                    {
                        receiver,
                        tokenId: BigInt(tokenId),
                        currency,
                        amount,
                        metadata: {
                            messageId: `0x${messageId}`,
                            channelId: `0x${channelId}`,
                            data: metadataData,
                        },
                    },
                ],
            )

            targetContract = SpaceAddressFromSpaceId(spaceId)
        }

        const hash = await execute(viem, {
            address: appAddress,
            calls: isEth
                ? [
                      {
                          abi: tippingFacetAbi,
                          to: targetContract,
                          functionName: 'sendTip',
                          args: [recipientType, encodedData],
                          value: amount,
                      },
                  ]
                : [
                      {
                          abi: erc20Abi,
                          to: currency,
                          functionName: 'approve',
                          args: [targetContract, amount],
                      },
                      {
                          abi: tippingFacetAbi,
                          to: targetContract,
                          functionName: 'sendTip',
                          args: [recipientType, encodedData],
                      },
                  ],
        })

        const receipt = await waitForTransactionReceipt(viem, { hash, confirmations: 3 })
        if (receipt.status !== 'success') {
            throw new Error(`Tip transaction failed: ${hash}`)
        }
        const tipEvent = parseEventLogs({
            abi: tippingFacetAbi,
            logs: receipt.logs,
            eventName: 'TipSent',
        })[0]

        return sendBlockchainTransaction(
            viem.chain.id,
            receipt,
            {
                case: 'tip',
                value: {
                    event: {
                        tokenId: tokenId ? BigInt(tokenId) : undefined,
                        currency: bin_fromHexString(tipEvent.args.currency),
                        sender: bin_fromHexString(tipEvent.args.sender),
                        receiver: bin_fromHexString(tipEvent.args.receiver),
                        amount: tipEvent.args.amount,
                        messageId: bin_fromHexString(messageId),
                        channelId: bin_fromHexString(channelId),
                    },
                    toUserAddress: bin_fromHexString(params.receiverUserId),
                },
            },
            {
                groupMentionTypes: tags?.groupMentionTypes || [],
                mentionedUserAddresses: tags?.mentionedUserAddresses || [],
                threadId: tags?.threadId,
                appClientAddress: tags?.appClientAddress,
                messageInteractionType: MessageInteractionType.TIP,
                participatingUserAddresses: [bin_fromHexString(params.receiverUserId)],
            },
        )
    }

    /** Sends a tip to a user by looking up their smart account by userId.
     *  Tip will always get funds from the app account balance.
     * @param params - Tip parameters including userId, amount, messageId, channelId, currency.
     * @returns The transaction hash and event ID
     */
    const sendTip = async (
        params: Omit<SendTipMemberParams, 'spaceId' | 'tokenId' | 'currency' | 'receiver'> & {
            currency?: Address
            userId: Address
        },
        tags?: PlainMessage<Tags>,
    ): Promise<{ txHash: string; eventId: string }> => {
        const smartAccountAddress = await getSmartAccountFromUserIdImpl(
            client.config.base.chainConfig.addresses.spaceFactory,
            viem,
            params.userId,
        )

        return sendTipImpl(
            {
                ...params,
                receiver: smartAccountAddress ?? params.userId,
                receiverUserId: params.userId,
            },
            tags,
        )
    }

    const getAllRoles = async (spaceId: string) => {
        const roles = await readContract(viem, {
            address: SpaceAddressFromSpaceId(spaceId),
            abi: rolesFacetAbi,
            functionName: 'getRoles',
        })
        return roles.filter((role) => role.name !== 'Owner')
    }

    const createChannelTx = async (
        spaceId: string,
        channelId: string,
        params: CreateChannelParams,
    ) => {
        const roles = await getAllRoles(spaceId)
        const allRolesThatCanRead = roles.filter((role) =>
            role.permissions.includes(Permission.Read),
        )
        const args: [`0x${string}`, string, bigint[]] = [
            channelId.startsWith('0x') ? (channelId as `0x${string}`) : `0x${channelId}`,
            JSON.stringify({ name: params.name, description: params.description ?? '' }),
            allRolesThatCanRead.map((role) => role.id),
        ] as const

        return writeContract(viem, {
            address: SpaceAddressFromSpaceId(spaceId),
            abi: channelsFacetAbi,
            functionName: 'createChannel',
            args,
        })
    }

    const createChannel = async (spaceId: string, params: CreateChannelParams) => {
        const channelId = makeUniqueChannelStreamId(spaceId)
        const hash = await createChannelTx(spaceId, channelId, params)
        const receipt = await waitForTransactionReceipt(viem, { hash })
        if (receipt.status !== 'success') {
            throw new Error(`Channel creation transaction failed: ${hash}`)
        }
        const events = await Promise.all([
            makeEvent(
                client.signerContext,
                make_ChannelPayload_Inception({
                    streamId: streamIdAsBytes(channelId),
                    settings: undefined,
                    channelSettings: {
                        autojoin: params.autojoin ?? false,
                        hideUserJoinLeaveEvents: params.hideUserJoinLeaveEvents ?? false,
                    },
                }),
            ),
            makeEvent(
                client.signerContext,
                make_MemberPayload_Membership2({
                    userId: client.userId,
                    op: MembershipOp.SO_JOIN,
                    initiatorId: client.userId,
                }),
            ),
        ])
        // the rpc client will retry a few times on failure, but if this doesn't succeed, the channel will exist on chain but not in the nodes
        await client.rpc.createStream({
            streamId: streamIdAsBytes(channelId),
            events: events,
            metadata: {
                appAddress: bin_fromHexString(appAddress),
            },
        })
        return channelId
    }

    /** Creates a role in the space. Requires gas */
    const createRole = async (
        spaceId: string,
        params: CreateRoleParams,
    ): Promise<{ roleId: number }> => {
        const txn = await spaceDapp.createRole(
            spaceId,
            params.name,
            params.permissions,
            params.users ?? [],
            createRuleStruct(params.rule ?? NoopOperation),
            client.wallet,
        )
        const { roleId, error } = await waitForRoleCreated(spaceDapp, spaceId, txn)
        if (error) {
            throw error
        }
        if (!roleId) {
            throw Error('Unexpected failure when waiting for role to be created')
        }
        return { roleId }
    }

    /** Updates the specified the role. Requires gas. */
    const updateRole = async (spaceId: string, roleId: number, params: CreateRoleParams) => {
        const currentValues = await spaceDapp.getRole(spaceId, roleId)
        return spaceDapp.updateRole(
            {
                permissions: params.permissions ?? currentValues?.permissions,
                roleId,
                roleName: params.name ?? currentValues?.name,
                ruleData: createRuleStruct(params.rule ?? NoopOperation) ?? currentValues?.ruleData,
                spaceNetworkId: spaceId,
                users: params.users ?? currentValues?.users ?? [],
            },
            client.wallet,
        )
    }

    /** Adds the specified role to a channel. Requires gas. */
    const addRoleToChannel = (channelId: string, roleId: number) => {
        const spaceId = spaceIdFromChannelId(channelId)
        return spaceDapp.addRoleToChannel(spaceId, channelId, roleId, client.wallet)
    }

    /** Deletes the specified role. Requires gas. */
    const deleteRole = (spaceId: string, roleId: number) => {
        return spaceDapp.deleteRole(spaceId, roleId, client.wallet)
    }

    /** Gets full details of a specific role */
    const getRole = (spaceId: string, roleId: number) => {
        return spaceDapp.getRole(spaceId, roleId)
    }

    return {
        sendMessage,
        editMessage,
        sendReaction,
        sendInteractionRequest,
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
        pinMessage,
        unpinMessage,
        getChannelSettings,
        sendTip,
        sendBlockchainTransaction,
        createChannel,
        getAllRoles,
        createRole,
        updateRole,
        addRoleToChannel,
        deleteRole,
        getRole,
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

const processMentions = (
    mentions: PostMessageOpts['mentions'],
): PlainMessage<ChannelMessage_Post_Mention>[] => {
    if (!mentions) {
        return []
    }
    return mentions.map((mention) => {
        if ('userId' in mention) {
            return create(ChannelMessage_Post_MentionSchema, {
                userId: mention.userId,
                displayName: mention.displayName,
            })
        } else if ('roleId' in mention) {
            return create(ChannelMessage_Post_MentionSchema, {
                mentionBehavior: {
                    case: 'atRole',
                    value: {
                        roleId: mention.roleId,
                    },
                },
            })
        } else if ('atChannel' in mention) {
            return create(ChannelMessage_Post_MentionSchema, {
                mentionBehavior: {
                    case: 'atChannel',
                    value: create(EmptySchema, {}),
                },
            })
        } else {
            throw new Error(`Invalid mention type: ${JSON.stringify(mention)}`)
        }
    })
}

const getSpaceIdFromStreamId = (streamId: string): string | undefined => {
    if (isDMChannelStreamId(streamId) || isGDMChannelStreamId(streamId)) {
        return
    }
    return spaceIdFromChannelId(streamId)
}

const createBasePayload = (
    userId: Address,
    streamId: string,
    eventId: string,
    createdAt: Date,
    event: StreamEvent,
): BasePayload => {
    const isDm = isDMChannelStreamId(streamId)
    const spaceId = getSpaceIdFromStreamId(streamId)

    if (isDm) {
        return {
            userId,
            spaceId: undefined,
            channelId: streamId,
            eventId,
            createdAt,
            event,
            isDm: true,
        }
    } else {
        return {
            userId,
            spaceId: spaceId as string,
            channelId: streamId,
            eventId,
            createdAt,
            event,
            isDm: false,
        }
    }
}
