import { create, fromBinary, fromJsonString, toBinary } from '@bufbuild/protobuf'
import { utils, ethers } from 'ethers'
import { SpaceDapp, Permission } from '@towns-protocol/web3'

import {
    getRefEventIdFromChannelMessage,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    make_ChannelPayload_Message,
    make_DMChannelPayload_Message,
    make_GDMChannelPayload_Message,
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
    makeBaseChainConfig,
    spaceIdFromChannelId,
    type CreateTownsClientParams,
    make_ChannelPayload_Redaction,
    parseAppPrivateData,
} from '@towns-protocol/sdk'
import { type Context, type Env, type Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import { default as jwt } from 'jsonwebtoken'
import { createNanoEvents, type Emitter } from 'nanoevents'
import {
    type ChannelMessage_Post_Attachment,
    type ChannelMessage_Post_Mention,
    ChannelMessage,
    ChannelMessageSchema,
    AppServiceRequestSchema,
    AppServiceResponseSchema,
    type AppServiceResponse,
    type EventPayload,
    SessionKeysSchema,
    type UserInboxPayload_GroupEncryptionSessions,
    MembershipOp,
    type PlainMessage,
    Tags,
    type StreamEvent,
    MessageInteractionType,
    type SlashCommand,
} from '@towns-protocol/proto'
import { bin_fromBase64, bin_fromHexString, bin_toHexString, check } from '@towns-protocol/dlog'
import {
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
import type { BlankEnv } from 'hono/types'

type BotActions = ReturnType<typeof buildBotActions>

export type BotPayload<
    T extends keyof BotEvents<Commands>,
    Commands extends PlainMessage<SlashCommand>[] = [],
> = Parameters<BotEvents<Commands>[T]>[1]

type MessageOpts = {
    threadId?: string
    replyId?: string
    mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
    attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
}

export type BotEvents<Commands extends PlainMessage<SlashCommand>[] = []> = {
    message: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
            /** You can use this to check if the message is a direct message */
            isDm: boolean
            /** You can use this to check if the message is a group message */
            isGdm: boolean
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
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
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
        },
    ) => void | Promise<void>
    mentioned: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
        },
    ) => void | Promise<void>
    reply: (
        handler: BotActions,
        event: BasePayload & {
            /** The decrypted message content */
            message: string
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
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
    threadMessage: (
        handler: BotActions,
        event: BasePayload & {
            /** The thread id where the message belongs to */
            threadId: string
            /** The decrypted message content */
            message: string
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
        },
    ) => Promise<void> | void
    mentionedInThread: (
        handler: BotActions,
        event: BasePayload & {
            /** The thread id where the message belongs to */
            threadId: string
            /** The decrypted message content */
            message: string
            /** Users mentioned in the message */
            mentions: Pick<ChannelMessage_Post_Mention, 'userId' | 'displayName'>[]
        },
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
            /** The eventId of the message that got replied */
            replyId: string | undefined
            /** The thread id where the message belongs to */
            threadId: string | undefined
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
    /** The creation time of the event */
    createdAt: Date
}

export class Bot<
    Commands extends PlainMessage<SlashCommand>[] = [],
    HonoEnv extends Env = BlankEnv,
> {
    private readonly client: ClientV2<BotActions>
    botId: string
    viemClient: ViemClient
    private readonly jwtSecret: Uint8Array
    private currentMessageTags: PlainMessage<Tags> | undefined
    private readonly emitter: Emitter<BotEvents<Commands>> = createNanoEvents()
    private readonly slashCommandHandlers: Map<string, BotEvents<Commands>['slashCommand']> =
        new Map()
    private readonly commands: Commands | undefined

    constructor(
        clientV2: ClientV2<BotActions>,
        viemClient: ViemClient,
        jwtSecretBase64: string,
        commands?: Commands,
    ) {
        this.client = clientV2
        this.botId = clientV2.userId
        this.viemClient = viemClient
        this.jwtSecret = bin_fromBase64(jwtSecretBase64)
        this.currentMessageTags = undefined
        this.commands = commands
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
                const createdAt = new Date(Number(parsed.event.createdAtEpochMs))
                this.currentMessageTags = parsed.event.tags
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
                            this.emitter.emit('eventRevoke', this.client, {
                                userId: userIdFromAddress(parsed.event.creatorAddress),
                                spaceId: spaceIdFromChannelId(streamId),
                                channelId: streamId,
                                refEventId: bin_toHexString(
                                    parsed.event.payload.value.content.value.eventId,
                                ),
                                eventId: parsed.hashStr,
                                createdAt,
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
                        switch (parsed.event.payload.value.content.case) {
                            case 'membership':
                                {
                                    const membership = parsed.event.payload.value.content.value
                                    const isChannel = isChannelStreamId(streamId)
                                    // TODO: do we want Bot to listen to onSpaceJoin/onSpaceLeave?
                                    if (!isChannel) continue
                                    if (membership.op === MembershipOp.SO_JOIN) {
                                        this.emitter.emit('channelJoin', this.client, {
                                            userId: userIdFromAddress(membership.userAddress),
                                            spaceId: spaceIdFromChannelId(streamId),
                                            channelId: streamId,
                                            eventId: parsed.hashStr,
                                            createdAt,
                                        })
                                    }
                                    if (membership.op === MembershipOp.SO_LEAVE) {
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
                                                this.emitter.emit('tip', this.client, {
                                                    userId: senderAddress,
                                                    spaceId: spaceIdFromChannelId(streamId),
                                                    channelId: streamId,
                                                    eventId: parsed.hashStr,
                                                    createdAt,
                                                    amount: tipEvent.amount,
                                                    currency: currency as `0x${string}`,
                                                    senderAddress: senderAddress,
                                                    receiverAddress: userIdFromAddress(
                                                        transactionContent.value.toUserAddress,
                                                    ),
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
                    const hasBotMention = payload.value.content.value.mentions.some(
                        (m) => m.userId === this.botId,
                    )
                    const userId = userIdFromAddress(parsed.event.creatorAddress)
                    const replyId = payload.value.replyId
                    const threadId = payload.value.threadId
                    const forwardPayload: BotPayload<'message', Commands> = {
                        userId,
                        eventId: parsed.hashStr,
                        spaceId: spaceIdFromChannelId(streamId),
                        channelId: streamId,
                        message: payload.value.content.value.body,
                        isDm: isDMChannelStreamId(streamId),
                        isGdm: isGDMChannelStreamId(streamId),
                        createdAt,
                        mentions: parseMentions(payload.value.content.value.mentions),
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
                    }

                    if (replyId) {
                        this.emitter.emit('reply', this.client, forwardPayload)
                    } else if (threadId && hasBotMention) {
                        this.emitter.emit('mentionedInThread', this.client, {
                            ...forwardPayload,
                            threadId,
                        })
                    } else if (threadId) {
                        this.emitter.emit('threadMessage', this.client, {
                            ...forwardPayload,
                            threadId,
                        })
                    } else if (hasBotMention) {
                        this.emitter.emit('mentioned', this.client, forwardPayload)
                    } else {
                        this.emitter.emit('message', this.client, forwardPayload)
                    }
                }
                break
            }
            case 'reaction': {
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
                this.emitter.emit('messageEdit', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    spaceId: spaceIdFromChannelId(streamId),
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                    message: payload.value.post?.content.value.body,
                    mentions: parseMentions(payload.value.post?.content.value.mentions),
                    createdAt,
                })
                break
            }
            case 'redaction': {
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

    async hasAdminPermission(userId: string, spaceId: string) {
        return this.client.hasAdminPermission(userId, spaceId)
    }

    async checkPermission(streamId: string, userId: string, permission: Permission) {
        return this.client.checkPermission(streamId, userId, permission)
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
     * Triggered when someone mentions the bot in a message
     */
    onMentioned(fn: BotEvents['mentioned']) {
        this.emitter.on('mentioned', fn)
    }

    /**
     * Triggered when someone replies to a message
     */
    onReply(fn: BotEvents['reply']) {
        this.emitter.on('reply', fn)
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

    onThreadMessage(fn: BotEvents['threadMessage']) {
        this.emitter.on('threadMessage', fn)
    }

    /**
     * Triggered when someone mentions the bot in a thread message
     */
    onMentionedInThread(fn: BotEvents['mentionedInThread']) {
        this.emitter.on('mentionedInThread', fn)
    }

    onSlashCommand(command: Commands[number]['name'], fn: BotEvents<Commands>['slashCommand']) {
        this.slashCommandHandlers.set(command, fn)
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
    const { privateKey, encryptionDevice, env } = parseAppPrivateData(appPrivateData)
    if (!env) {
        throw new Error('Failed to parse APP_PRIVATE_DATA')
    }
    const baseConfig = makeBaseChainConfig(env)
    const viemClient = createViemClient({
        transport: baseRpcUrl
            ? http(baseRpcUrl, { batch: true })
            : http(baseConfig.rpcUrl, { batch: true }),
        // TODO: would be nice if makeBaseChainConfig returned a viem chain
        chain: baseConfig.chainConfig.chainId === base.id ? base : baseSepolia,
    })
    const spaceDapp = new SpaceDapp(
        baseConfig.chainConfig,
        new ethers.providers.JsonRpcProvider(baseRpcUrl || baseConfig.rpcUrl),
    )
    const client = await createTownsClient({
        privateKey,
        env,
        encryptionDevice: {
            fromExportedDevice: encryptionDevice,
        },
        ...clientOpts,
    }).then((x) => x.extend((townsClient) => buildBotActions(townsClient, viemClient, spaceDapp)))
    return new Bot<Commands, HonoEnv>(client, viemClient, jwtSecretBase64, opts.commands)
}

const buildBotActions = (client: ClientV2, viemClient: ViemClient, spaceDapp: SpaceDapp) => {
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

        let eventPayload: PlainMessage<StreamEvent>['payload']
        if (isChannelStreamId(streamId)) {
            eventPayload = make_ChannelPayload_Message(message)
        } else if (isDMChannelStreamId(streamId)) {
            eventPayload = make_DMChannelPayload_Message(message)
        } else if (isGDMChannelStreamId(streamId)) {
            eventPayload = make_GDMChannelPayload_Message(message)
        } else {
            throw new Error(`Invalid stream ID type: ${streamId}`)
        }
        return client.sendEvent(streamId, eventPayload, eventTags)
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
        adminRemoveEvent,
        sendKeySolicitation,
        uploadDeviceKeys,
        decryptSessions,
        hasAdminPermission,
        checkPermission,
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
