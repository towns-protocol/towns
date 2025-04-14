/* eslint-disable no-console */
// TODO: proper logging
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
    SessionKeysSchema,
    type UserInboxPayload_GroupEncryptionSessions,
} from '@towns-protocol/proto'
import { bin_fromBase64, bin_toHexString, check } from '@towns-protocol/dlog'
import {
    GroupEncryptionAlgorithmId,
    parseGroupEncryptionAlgorithmId,
} from '@towns-protocol/encryption'

type BotActions = ReturnType<typeof buildBotActions>

type BotEvents = {
    message: (handler: BotActions, event: BasePayload & { message: string }) => void
    redact: (handler: BotActions, event: BasePayload & { refEventId: string }) => void
    messageDelete: (handler: BotActions, event: BasePayload & { eventId: string }) => void
    botMention: (handler: BotActions, event: BasePayload & { message: string }) => void
    reply: (handler: BotActions, event: BasePayload & { message: string }) => void
    reaction: (
        handler: BotActions,
        event: BasePayload & { reaction: string; messageId: string; userId: string },
    ) => void
    eventRevoke: (handler: BotActions, event: BasePayload & { eventId: string }) => void
    tip: (handler: BotActions, event: BasePayload & { amount: bigint }) => void
    channelJoin: (handler: BotActions, event: BasePayload) => void
    channelLeave: (handler: BotActions, event: BasePayload) => void
    streamMessage: (handler: BotActions, event: BasePayload & { message: string }) => void
}

type BasePayload = {
    userId: string
    channelId: string
    eventId: string
}

export class Bot extends (EventEmitter as new () => TypedEmitter<BotEvents>) {
    private readonly server: Hono
    private readonly client: ClientV2<BotActions>
    botId: string

    constructor(clientV2: ClientV2<BotActions>, private readonly jwtSecret: string) {
        super()
        this.client = clientV2
        this.botId = clientV2.userId
        this.server = new Hono()
        this.server.post('webhook', (c) => this.webhookResponseHandler(c))
    }

    async start(port: number) {
        await this.client.uploadDeviceKeys()
        // Maybe we should let the user do this instead, so they can use the runtime that they want (?)
        serve({ port, fetch: this.server.fetch })
    }

    // TODO: check JWT token matches the request JWT from app registry
    private async webhookResponseHandler(c: Context) {
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
            check(
                events.length === groupEncryptionSessionsMessages.length,
                'events and groupEncryptionSessionsMessages must be the same length',
            )
            const zip = events.map((m, i) => [m, groupEncryptionSessionsMessages[i]] as const)
            for (const [parsed, groupEncryptionSession] of zip) {
                if (parsed.creatorUserId === this.client.userId) {
                    continue
                }
                if (!parsed.event.payload.case) {
                    continue
                }
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
                            // TODO
                        } else if (
                            parsed.event.payload.value.content.case === 'channelProperties'
                        ) {
                            // TODO
                        } else if (parsed.event.payload.value.content.case === 'inception') {
                            // TODO
                        } else {
                            logNever(parsed.event.payload.value.content)
                        }
                        break
                    }
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

    async handleChannelMessage(streamId: string, parsed: ParsedEvent, { payload }: ChannelMessage) {
        if (!payload.case) {
            return
        }

        switch (payload.case) {
            case 'post': {
                if (payload.value.content.case === 'text') {
                    this.emit('message', this.client, {
                        userId: userIdFromAddress(parsed.event.creatorAddress),
                        eventId: parsed.hashStr,
                        channelId: streamId,
                        message: payload.value.content.value.body,
                    })
                }
                break
            }
            case 'reaction': {
                this.emit('reaction', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    channelId: streamId,
                    reaction: payload.value.reaction,
                    messageId: payload.value.refEventId,
                })
                break
            }
            case 'edit': {
                // TODO: bot doesnt forward message edits.
                // Need to think about a good API for it
                break
            }
            case 'redaction': {
                this.emit('redact', this.client, {
                    userId: userIdFromAddress(parsed.event.creatorAddress),
                    eventId: parsed.hashStr,
                    channelId: streamId,
                    refEventId: payload.value.refEventId,
                })
                break
            }
            default:
                logNever(payload)
        }
    }
    async sendMessage(channelId: string, message: string) {
        return this.client.sendMessage(channelId, message)
    }

    async sendReaction(channelId: string, refEventId: string, reaction: string) {
        return this.client.sendReaction(channelId, refEventId, reaction)
    }

    async removeEvent(channelId: string, refEventId: string) {
        return this.client.removeEvent(channelId, refEventId)
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
    }).then((x) => x.extend(buildBotActions))
    return new Bot(client, jwtSecret)
}

const buildBotActions = (client: ClientV2) => {
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
            mentions?: ChannelMessage_Post_Mention[]
            attachments?: ChannelMessage_Post_Attachment[]
        },
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
        return sendMessageEvent({ streamId, payload })
    }

    const editMessage = async (streamId: string, messageId: string, message: string) => {
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

    const sendReaction = async (streamId: string, messageId: string, reaction: string) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'reaction', value: { refEventId: messageId, reaction } },
        })
        return sendMessageEvent({ streamId, payload })
    }

    const removeEvent = async (streamId: string, messageId: string) => {
        const payload = create(ChannelMessageSchema, {
            payload: { case: 'redaction', value: { refEventId: messageId } },
        })
        return sendMessageEvent({ streamId, payload })
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
    return {
        sendMessage,
        editMessage,
        sendDm,
        sendReaction,
        removeEvent,
        sendKeySolicitation,
        uploadDeviceKeys,
        decryptSessions,
    }
}
