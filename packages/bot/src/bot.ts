/* eslint-disable no-console */
// TODO: proper logging
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'

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
    logNever,
    userIdFromAddress,
} from '@towns-protocol/sdk'
import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
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
    ExportedDeviceSchema,
} from '@towns-protocol/proto'
import { bin_fromBase64, bin_toHexString } from '@towns-protocol/dlog'
import type { GroupEncryptionAlgorithmId } from '@towns-protocol/encryption'

type BasePayload = {
    userId: string
    channelId: string
    eventId: string
}

type BotActions = {
    sendReaction: (
        channelId: string,
        messageId: string,
        reaction: string,
    ) => Promise<{ eventId: string }>
    sendMessage: (
        channelId: string,
        message: string,
        opts?: {
            threadId?: string
            replyId?: string
            mentions?: ChannelMessage_Post_Mention[]
            attachments?: ChannelMessage_Post_Attachment[]
        },
    ) => Promise<{ eventId: string }>
    editMessage: (
        channelId: string,
        messageId: string,
        message: string,
    ) => Promise<{ eventId: string }>
    redactEvent: (channelId: string, refEventId: string) => Promise<{ eventId: string }>
    sendDm: BotActions['sendMessage']
    sendKeySolicitation: (streamId: string, sessionIds: string[]) => Promise<{ eventId: string }>
    // TODO: sendTip
}

type BotEvents = {
    message: (handler: BotActions, opts: BasePayload & { message: string }) => void
    redact: (handler: BotActions, opts: BasePayload & { refEventId: string }) => void
    messageDelete: (handler: BotActions, opts: BasePayload & { eventId: string }) => void
    botMention: (handler: BotActions, opts: BasePayload & { message: string }) => void
    reply: (handler: BotActions, opts: BasePayload & { message: string }) => void
    reaction: (
        handler: BotActions,
        opts: BasePayload & { reaction: string; messageId: string; userId: string },
    ) => void
    eventRevoke: (handler: BotActions, opts: BasePayload & { eventId: string }) => void
    tip: (handler: BotActions, opts: BasePayload & { amount: bigint }) => void
    channelJoin: (handler: BotActions, opts: BasePayload) => void
    channelLeave: (handler: BotActions, opts: BasePayload) => void
    streamMessage: (handler: BotActions, opts: BasePayload & { message: string }) => void
}

class Bot extends (EventEmitter as new () => TypedEmitter<BotEvents>) {
    private readonly server: Hono
    private readonly client: ClientV2<BotActions>
    botId: string
    // private readonly webhookClient: WebhookClient
    constructor(clientV2: ClientV2<BotActions>, private readonly jwtSecret: string) {
        super()
        this.client = clientV2
        this.botId = clientV2.userId
        this.server = new Hono()
        this.server.post('webhook', (c) => this.webhookResponseHandler(c))
    }

    start(port: number) {
        // Maybe we should let the user do this instead, so they can use the runtime that they want (?)
        serve({ port, fetch: this.server.fetch })
    }

    private async webhookResponseHandler(c: Context) {
        const body = await c.req.arrayBuffer()
        const encryptionDevice = this.client.crypto.getUserDevice()
        const request = fromBinary(AppServiceRequestSchema, new Uint8Array(body))

        // TODO: check JWT token matches the request JWT from app registry
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
            // TODO: handle events
            for (const event of request.payload.value.events) {
                // no Promise.all here i think
                await this.handleEvent(event)
            }
            response = statusResponse
        } else if (request.payload.case === 'status') {
            // status is default case
            response = statusResponse
        }

        c.header('Content-Type', 'application/x-protobuf')
        return c.body(toBinary(AppServiceResponseSchema, response), 200)
    }

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
            // TODO: why we need this?
            console.log('groupEncryptionSessionsMessages', groupEncryptionSessionsMessages)
            const messages = await this.client.unpackEnvelopes(appEvent.payload.value.messages)
            for (const message of messages) {
                if (!message.event.payload.case) {
                    continue
                }

                switch (message.event.payload.case) {
                    case 'channelPayload':
                    case 'dmChannelPayload':
                    case 'gdmChannelPayload': {
                        // TODO: decrypt message
                        if (message.event.payload.value.content.case === 'message') {
                            const encryptedMessage = message.event.payload.value.content.value
                            console.log(encryptedMessage)
                            // use my fallback key to decrypt ciphertextS in the group encryption messages
                            // comma separated liss of decrytion keys, one for each session
                            const decryptedMessage = await this.client.crypto.decryptWithDeviceKey(
                                encryptedMessage.ciphertext,
                                encryptedMessage.senderKey,
                            )
                            this.emit('message', this.client, {
                                userId: userIdFromAddress(message.event.creatorAddress),
                                eventId: message.hashStr,
                                channelId: streamId,
                                message: decryptedMessage,
                            })
                        }
                        break
                    }
                    case 'miniblockHeader':
                    case 'memberPayload':
                    case 'spacePayload':
                    case 'userPayload':
                    case 'userSettingsPayload':
                    case 'userMetadataPayload':
                    case 'userInboxPayload':
                    case 'mediaPayload':
                        continue
                    default:
                        logNever(message.event.payload)
                }
            }
        } else if (appEvent.payload.case === 'solicitation') {
            const missingSessionIds = appEvent.payload.value.sessionIds.filter(
                (sessionId) => sessionId !== '',
            )
            const { eventId } = await this.client.sendKeySolicitation(streamId, missingSessionIds)
            console.log('sent key solicitation for sessions:', missingSessionIds, eventId)
        } else {
            logNever(appEvent.payload)
        }
    }

    async sendMessage(channelId: string, message: string) {
        return this.client.sendMessage(channelId, message)
    }

    async sendReaction(channelId: string, refEventId: string, reaction: string) {
        return this.client.sendReaction(channelId, refEventId, reaction)
    }

    async redactEvent(channelId: string, refEventId: string) {
        return this.client.redactEvent(channelId, refEventId)
    }

    onMessage(fn: (handler: BotActions, opts: BasePayload & { message: string }) => void) {
        this.on('message', fn)
    }

    onRedact(fn: (handler: BotActions, opts: BasePayload & { refEventId: string }) => void) {
        this.on('redact', fn)
    }

    onMessageDelete(fn: (handler: BotActions, opts: BasePayload & { eventId: string }) => void) {
        this.on('messageDelete', fn)
    }

    onBotMention(fn: (handler: BotActions, opts: BasePayload & { message: string }) => void) {
        this.on('botMention', fn)
    }

    onReply(fn: (handler: BotActions, opts: BasePayload & { message: string }) => void) {
        this.on('reply', fn)
    }

    onReaction(
        fn: (
            handler: BotActions,
            opts: BasePayload & { reaction: string; messageId: string; userId: string },
        ) => void,
    ) {
        this.on('reaction', fn)
    }

    onEventRevoke(fn: (handler: BotActions, opts: BasePayload & { eventId: string }) => void) {
        this.on('eventRevoke', fn)
    }

    onTip(fn: (handler: BotActions, opts: BasePayload & { amount: bigint }) => void) {
        this.on('tip', fn)
    }

    onChannelJoin(fn: (handler: BotActions, opts: BasePayload) => void) {
        this.on('channelJoin', fn)
    }

    onChannelLeave(fn: (handler: BotActions, opts: BasePayload) => void) {
        this.on('channelLeave', fn)
    }

    onStreamMessage(fn: (handler: BotActions, opts: BasePayload & { message: string }) => void) {
        this.on('streamMessage', fn)
    }

    // onSlashCommand(command: Commands, fn: (client: BotActions, opts: BasePayload) => void) {
    //     this.cb.onSlashCommand.set(command, fn)
    // }
}

export const makeTownsBot = async (
    mnemonic: string,
    encryptionDeviceBase64: string,
    jwtSecret: string,
    env: Parameters<typeof makeRiverConfig>[0],
) => {
    const client = await createTownsClient({
        mnemonic,
        env,
        encryptionDevice: {
            fromExportedDevice: fromBinary(
                ExportedDeviceSchema,
                bin_fromBase64(encryptionDeviceBase64),
            ),
        },
    }).then((x) => x.extend(botBotActions))
    return new Bot(client, jwtSecret)
}

const botBotActions = (client: ClientV2): BotActions => {
    const sendMessageEvent = async ({
        streamId,
        payload,
    }: {
        streamId: string
        payload: ChannelMessage
    }) => {
        const stream = await client.getStream(streamId)
        const { hash: prevMiniblockHash } = await client.rpc.getLastMiniblockHash({
            streamId: streamIdAsBytes(streamId),
        })
        // TODO: check entitlements. (should it be a extension?)
        // if (isChannelStreamId(streamId)) {
        // }
        // TODO: tags
        const tags = undefined
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
                tags,
            )
        } else if (isDMChannelStreamId(streamId)) {
            event = await makeEvent(
                client.signer,
                make_DMChannelPayload_Message(message),
                prevMiniblockHash,
                tags,
            )
        } else if (isGDMChannelStreamId(streamId)) {
            event = await makeEvent(
                client.signer,
                make_GDMChannelPayload_Message(message),
                prevMiniblockHash,
                tags,
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

    const sendKeySolicitation: BotActions['sendKeySolicitation'] = async (streamId, sessionIds) => {
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

    const sendMessage: BotActions['sendMessage'] = async (streamId, message, opts) => {
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
        return sendMessageEvent({ streamId, payload })
    }
    const editMessage: BotActions['editMessage'] = async (streamId, messageId, message) => {
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
        return sendMessageEvent({ streamId, payload })
    }
    const sendDm = sendMessage
    const sendReaction: BotActions['sendReaction'] = async (streamId, messageId, reaction) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'reaction', value: { refEventId: messageId, reaction } },
        })
        return sendMessageEvent({ streamId, payload })
    }

    const redactEvent: BotActions['redactEvent'] = async (streamId, messageId) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'redaction', value: { refEventId: messageId } },
        })
        return sendMessageEvent({ streamId, payload })
    }
    return {
        sendMessage,
        editMessage,
        sendDm,
        sendReaction,
        redactEvent,
        sendKeySolicitation,
    }
}
