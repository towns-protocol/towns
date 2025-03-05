import { PlainMessage } from '@bufbuild/protobuf'

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
} from '@river-build/sdk'
import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import EventEmitter from 'node:events'
import TypedEmitter from 'typed-emitter'
import {
    type ChannelMessage_Post_Attachment,
    type ChannelMessage_Post_Mention,
    ChannelMessage,
    type Envelope,
} from '@river-build/proto'
import { bin_toHexString } from '@river-build/dlog'
import type { GroupEncryptionAlgorithmId } from '@river-build/encryption'

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
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
            attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
        },
    ) => Promise<{ eventId: string }>
    editMessage: (
        channelId: string,
        messageId: string,
        message: string,
    ) => Promise<{ eventId: string }>
    redactEvent: (channelId: string, refEventId: string) => Promise<{ eventId: string }>
    sendDm: BotActions['sendMessage']
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
    constructor(clientV2: ClientV2<BotActions>) {
        super()
        this.client = clientV2
        this.botId = clientV2.userId
        this.server = new Hono()
        this.server.get('/webhook', (c) => {
            return c.text('')
        })
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

    start(port: number) {
        // I would like to let the user do this instead, so they can use the runtime that they want
        serve({ port, fetch: this.server.fetch })
    }

    private async webhookResponseHandler(c: Context) {
        // - accepts a protobuf payload
        // - checks that the payload is signed by the bot-registry-server
        // - processes payload, returns BotWebookResponse
        // this.emit('streamMessage', this.client, {
        //     userId: 'bot',
        //     channelId: 'bot',
        //     eventId: 'bot',
        //     message: 'bot',
        // })
    }
}

export const makeTownsBot = async (
    privateKey: string,
    env: Parameters<typeof makeRiverConfig>[0],
) => {
    const client = await createTownsClient({
        privateKey,
        env,
    }).then((x) => x.extend(botBotActions))
    return new Bot(client)
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
            payload.toBinary(),
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

    const sendMessage: BotActions['sendMessage'] = async (streamId, message, opts) => {
        const payload = new ChannelMessage({
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
        const payload = new ChannelMessage({
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
        const payload = new ChannelMessage({
            payload: { case: 'reaction', value: { refEventId: messageId, reaction } },
        })
        return sendMessageEvent({ streamId, payload })
    }

    const redactEvent: BotActions['redactEvent'] = async (streamId, messageId) => {
        const payload = new ChannelMessage({
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
    }
}
