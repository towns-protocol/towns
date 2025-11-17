import { fromBinary, fromJsonString } from '@bufbuild/protobuf'
import type { Emitter } from 'nanoevents'
import {
    type EventPayload,
    type ChannelMessage,
    ChannelMessageSchema,
    type ChannelMessage_Post_Mention,
    MembershipOp,
    type Tags,
    type PlainMessage,
    MessageInteractionType,
    InteractionResponsePayloadSchema,
    InteractionResponsePayload,
    type SlashCommand,
} from '@towns-protocol/proto'
import {
    streamIdAsString,
    spaceIdFromChannelId,
    userIdFromAddress,
    isChannelStreamId,
    type ParsedEvent,
    type ClientV2,
    logNever,
} from '@towns-protocol/sdk'
import { utils } from 'ethers'
import type { Address } from 'viem'
import {
    bin_toHexString,
    bin_equal,
    bin_fromHexString,
    bin_fromBase64,
    dlog,
} from '@towns-protocol/utils'
import { parse as superjsonParse } from 'superjson'
import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { BotActions } from './actions'

const debug = dlog('csb:bot')

// Type definitions for bot events
export type BasePayload = {
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
}

export type DecryptedInteractionResponse = {
    recipient: Uint8Array
    payload: PlainMessage<InteractionResponsePayload>
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
        event: BasePayload & {
            typeUrl: string
            schema: Schema
            data: NonNullable<Schema['~standard']['types']>['input']
        },
    ) => void | Promise<void>
    interactionResponse: (
        handler: BotActions,
        event: BasePayload & {
            /** The interaction response that was received */
            response: DecryptedInteractionResponse
        },
    ) => void | Promise<void>
}

export type BotPayload<
    T extends keyof BotEvents<Commands>,
    Commands extends PlainMessage<SlashCommand>[] = [],
> = Parameters<BotEvents<Commands>[T]>[1]

// Helper functions for event handling
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

const createBasePayload = (parsed: ParsedEvent, streamId: string): BasePayload => ({
    userId: userIdFromAddress(parsed.event.creatorAddress),
    spaceId: spaceIdFromChannelId(streamId),
    channelId: streamId,
    eventId: parsed.hashStr,
    createdAt: new Date(Number(parsed.event.createdAtEpochMs)),
})

type EventDispatcherContext<Commands extends PlainMessage<SlashCommand>[] = []> = {
    client: ClientV2<BotActions>
    botId: string
    emitter: Emitter<BotEvents<Commands>>
    slashCommandHandlers: Map<string, BotEvents<Commands>['slashCommand']>
    gmTypedHandlers: Map<
        string,
        {
            schema: StandardSchemaV1
            handler: (
                handler: BotActions,
                event: BasePayload & { typeUrl: string; data: any },
            ) => void | Promise<void>
        }
    >
    currentMessageTags?: PlainMessage<Tags>
    userDevice: { deviceKey: string; fallbackKey: string }
}

export async function handleEvent<Commands extends PlainMessage<SlashCommand>[] = []>(
    ctx: EventDispatcherContext<Commands>,
    appEvent: EventPayload,
) {
    if (!appEvent.payload.case || !appEvent.payload.value) return
    const streamId = streamIdAsString(appEvent.payload.value.streamId)

    if (appEvent.payload.case === 'messages') {
        const groupEncryptionSessionsMessages = await ctx.client
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
        const events = await ctx.client.unpackEnvelopes(appEvent.payload.value.messages)
        const zip = events.map((m, i) => [m, groupEncryptionSessionsMessages[i]] as const)
        for (const [parsed, groupEncryptionSession] of zip) {
            if (parsed.creatorUserId === ctx.client.userId) {
                continue
            }
            if (!parsed.event.payload.case) {
                continue
            }
            ctx.currentMessageTags = parsed.event.tags
            const basePayload = createBasePayload(parsed, streamId)
            debug('emit:streamEvent', {
                userId: basePayload.userId,
                channelId: streamId,
                eventId: basePayload.eventId,
            })
            ctx.emitter.emit('streamEvent', ctx.client, {
                ...basePayload,
                event: parsed,
            })
            switch (parsed.event.payload.case) {
                case 'channelPayload':
                case 'dmChannelPayload':
                case 'gdmChannelPayload': {
                    if (!parsed.event.payload.value.content.case) return
                    if (parsed.event.payload.value.content.case === 'message') {
                        await ctx.client.importGroupEncryptionSessions({
                            streamId,
                            sessions: groupEncryptionSession,
                        })
                        const eventCleartext = await ctx.client.crypto.decryptGroupEvent(
                            streamId,
                            parsed.event.payload.value.content.value,
                        )
                        let channelMessage: ChannelMessage
                        if (typeof eventCleartext === 'string') {
                            channelMessage = fromJsonString(ChannelMessageSchema, eventCleartext)
                        } else {
                            channelMessage = fromBinary(ChannelMessageSchema, eventCleartext)
                        }
                        await handleChannelMessage(ctx, streamId, parsed, channelMessage)
                    } else if (parsed.event.payload.value.content.case === 'redaction') {
                        const refEventId = bin_toHexString(
                            parsed.event.payload.value.content.value.eventId,
                        )
                        debug('emit:eventRevoke', {
                            userId: basePayload.userId,
                            channelId: streamId,
                            refEventId,
                        })
                        ctx.emitter.emit('eventRevoke', ctx.client, {
                            ...basePayload,
                            refEventId,
                        })
                    } else if (parsed.event.payload.value.content.case === 'channelProperties') {
                        // TODO: currently, no support for channel properties (update name, topic)
                    } else if (parsed.event.payload.value.content.case === 'inception') {
                        // TODO: is there any use case for this?
                    } else if (parsed.event.payload.value.content.case === 'custom') {
                        // TODO: what to do with custom payload for bot?
                    } else if (parsed.event.payload.value.content.case === 'interactionRequest') {
                        // ignored for bots
                    } else if (parsed.event.payload.value.content.case === 'interactionResponse') {
                        const payload = parsed.event.payload.value.content.value
                        if (!bin_equal(payload.recipient, bin_fromHexString(ctx.botId))) {
                            continue
                        }
                        if (!payload.encryptedData) {
                            continue
                        }
                        if (payload.encryptedData.deviceKey !== ctx.userDevice.deviceKey) {
                            continue
                        }
                        const decryptedBase64 = await ctx.client.crypto.decryptWithDeviceKey(
                            payload.encryptedData.ciphertext,
                            payload.encryptedData.senderKey,
                        )
                        const decrypted = bin_fromBase64(decryptedBase64)
                        const response = fromBinary(InteractionResponsePayloadSchema, decrypted)
                        ctx.emitter.emit('interactionResponse', ctx.client, {
                            ...basePayload,
                            response: {
                                recipient: payload.recipient,
                                payload: response,
                            },
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
                                        eventId: basePayload.eventId,
                                    })
                                    ctx.emitter.emit('channelJoin', ctx.client, basePayload)
                                }
                                if (membership.op === MembershipOp.SO_LEAVE) {
                                    debug('emit:channelLeave', {
                                        userId: userIdFromAddress(membership.userAddress),
                                        channelId: streamId,
                                        eventId: basePayload.eventId,
                                    })
                                    ctx.emitter.emit('channelLeave', ctx.client, basePayload)
                                }
                            }
                            break

                        case 'memberBlockchainTransaction':
                            {
                                const transactionContent =
                                    parsed.event.payload.value.content.value.transaction?.content
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
                                            const senderUserId = userIdFromAddress(fromUserAddress)
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
                                            ctx.emitter.emit('tip', ctx.client, {
                                                ...basePayload,
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
        await ctx.client.sendKeySolicitation(streamId, missingSessionIds)
    } else {
        logNever(appEvent.payload)
    }
}

async function handleChannelMessage<Commands extends PlainMessage<SlashCommand>[] = []>(
    ctx: EventDispatcherContext<Commands>,
    streamId: string,
    parsed: ParsedEvent,
    { payload }: ChannelMessage,
) {
    if (!payload.case) {
        return
    }

    const basePayload = createBasePayload(parsed, streamId)
    switch (payload.case) {
        case 'post': {
            if (payload.value.content.case === 'text') {
                const replyId = payload.value.replyId
                const threadId = payload.value.threadId
                const mentions = parseMentions(payload.value.content.value.mentions)
                const isMentioned = mentions.some((m) => m.userId === ctx.botId)
                const forwardPayload = {
                    ...basePayload,
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
                    const { command, args } = parseSlashCommand(payload.value.content.value.body)
                    const handler = ctx.slashCommandHandlers.get(command)
                    if (handler) {
                        void handler(ctx.client, {
                            ...forwardPayload,
                            command: command as Commands[number]['name'],
                            args,
                        })
                    }
                } else {
                    debug('emit:message', forwardPayload)
                    ctx.emitter.emit('message', ctx.client, forwardPayload)
                }
            } else if (payload.value.content.case === 'gm') {
                const gmContent = payload.value.content.value

                const { typeUrl, value } = gmContent

                ctx.emitter.emit('rawGmMessage', ctx.client, {
                    ...basePayload,
                    typeUrl,
                    message: value ?? new Uint8Array(),
                })

                const typedHandler = ctx.gmTypedHandlers.get(typeUrl)

                if (typedHandler) {
                    try {
                        const possibleJsonString = new TextDecoder().decode(value)
                        const deserializedData = superjsonParse<any>(possibleJsonString)
                        const result =
                            await typedHandler.schema['~standard'].validate(deserializedData)
                        if ('issues' in result && result.issues) {
                            debug('GM validation failed', { typeUrl, issues: result.issues })
                        } else {
                            debug('emit:gmMessage', {
                                userId: basePayload.userId,
                                channelId: streamId,
                            })
                            void typedHandler.handler(ctx.client, {
                                ...basePayload,
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
                userId: basePayload.userId,
                channelId: streamId,
                reaction: payload.value.reaction,
                messageId: payload.value.refEventId,
            })
            ctx.emitter.emit('reaction', ctx.client, {
                ...basePayload,
                reaction: payload.value.reaction,
                messageId: payload.value.refEventId,
            })
            break
        }
        case 'edit': {
            // TODO: framework doesnt handle non-text edits
            if (payload.value.post?.content.case !== 'text') break
            const mentions = parseMentions(payload.value.post?.content.value.mentions)
            const isMentioned = mentions.some((m) => m.userId === ctx.botId)
            debug('emit:messageEdit', {
                userId: basePayload.userId,
                channelId: streamId,
                refEventId: payload.value.refEventId,
                messagePreview: payload.value.post?.content.value.body.substring(0, 50),
                isMentioned,
            })
            ctx.emitter.emit('messageEdit', ctx.client, {
                ...basePayload,
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
            const refEventId = payload.value.refEventId
            debug('emit:redaction', {
                userId: basePayload.userId,
                channelId: streamId,
                refEventId,
            })
            ctx.emitter.emit('redaction', ctx.client, {
                ...basePayload,
                refEventId,
            })
            break
        }
        default:
            logNever(payload)
    }
}
