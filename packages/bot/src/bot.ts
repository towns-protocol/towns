import { PlainMessage } from '@bufbuild/protobuf'

import {
    Client,
    Entitlements,
    makeBaseProvider,
    makeRiverProvider,
    makeSignerContext,
    makeStreamRpcClient,
    RiverDbManager,
    type RiverConfig,
    type SignerContext,
    type StreamRpcClient,
} from '@river-build/sdk'
import { Hono, type Context } from 'hono'
import { serve } from '@hono/node-server'
import { ethers } from 'ethers'
import EventEmitter from 'node:events'
import TypedEmitter from 'typed-emitter'
import {
    ChannelMessage_Post_Content_Text,
    type ChannelMessage_Post_Attachment,
    type ChannelMessage_Post_Mention,
} from '@river-build/proto'
import { RiverRegistry, SpaceDapp } from '@river-build/web3'

type BasePayload = {
    userId: string
    channelId: string
    eventId: string
}

type Actions = {
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
    sendDm: Actions['sendMessage']
    sendTip: (
        userId: string,
        eventId: string,
        // TODO: tip params
    ) => void // amount in wei
}

type BotEvents = {
    message: (handler: Actions, opts: BasePayload & { message: string }) => void
    redact: (handler: Actions, opts: BasePayload & { refEventId: string }) => void
    messageDelete: (handler: Actions, opts: BasePayload & { eventId: string }) => void
    botMention: (handler: Actions, opts: BasePayload & { message: string }) => void
    reply: (handler: Actions, opts: BasePayload & { message: string }) => void
    reaction: (
        handler: Actions,
        opts: BasePayload & { reaction: string; messageId: string; userId: string },
    ) => void
    eventRevoke: (handler: Actions, opts: BasePayload & { eventId: string }) => void
    tip: (handler: Actions, opts: BasePayload & { amount: bigint }) => void
    channelJoin: (handler: Actions, opts: BasePayload) => void
    channelLeave: (handler: Actions, opts: BasePayload) => void
    streamMessage: (handler: Actions, opts: BasePayload & { message: string }) => void
}

const buildBotWallet = async (privateKey: string) => {
    const signer = new ethers.Wallet(privateKey)
    const delegateWallet = ethers.Wallet.createRandom()
    const signerContext = await makeSignerContext(signer, delegateWallet)
    return signerContext
}

class Bot extends (EventEmitter as new () => TypedEmitter<BotEvents>) {
    private readonly server: Hono
    private readonly rpcClient: Client
    botId: string
    // private readonly webhookClient: WebhookClient
    constructor(signerContext: SignerContext, rpcClient: StreamRpcClient, config: RiverConfig) {
        super()
        const botId = 'bot'
        const cryptoStore = RiverDbManager.getCryptoDb(botId)
        const baseProvider = makeBaseProvider(config)
        const spaceDapp = new SpaceDapp(config.base.chainConfig, baseProvider)
        const entitlementsDelegate = new Entitlements(config, spaceDapp)

        this.botId = botId
        // TODO: disable persistence in client
        this.rpcClient = new Client(signerContext, rpcClient, cryptoStore, entitlementsDelegate)
        this.server = new Hono()
        this.server.get('/webhook', (c) => {
            return c.text('')
        })
    }

    async sendMessage(channelId: string, message: string) {
        return this.rpcClient.sendMessage(channelId, message)
    }

    async sendReaction(channelId: string, refEventId: string, reaction: string) {
        return this.rpcClient.sendChannelMessage_Reaction(channelId, { refEventId, reaction })
    }

    async redactEvent(channelId: string, refEventId: string) {
        return this.rpcClient.sendChannelMessage_Redaction(channelId, { refEventId })
    }

    onMessage(fn: (handler: Actions, opts: BasePayload & { message: string }) => void) {
        this.on('message', fn)
    }

    onRedact(fn: (handler: Actions, opts: BasePayload & { refEventId: string }) => void) {
        this.on('redact', fn)
    }

    onMessageDelete(fn: (handler: Actions, opts: BasePayload & { eventId: string }) => void) {
        this.on('messageDelete', fn)
    }

    onBotMention(fn: (handler: Actions, opts: BasePayload & { message: string }) => void) {
        this.on('botMention', fn)
    }

    onReply(fn: (handler: Actions, opts: BasePayload & { message: string }) => void) {
        this.on('reply', fn)
    }

    onReaction(
        fn: (
            handler: Actions,
            opts: BasePayload & { reaction: string; messageId: string; userId: string },
        ) => void,
    ) {
        this.on('reaction', fn)
    }

    onEventRevoke(fn: (handler: Actions, opts: BasePayload & { eventId: string }) => void) {
        this.on('eventRevoke', fn)
    }

    onTip(fn: (handler: Actions, opts: BasePayload & { amount: bigint }) => void) {
        this.on('tip', fn)
    }

    onChannelJoin(fn: (handler: Actions, opts: BasePayload) => void) {
        this.on('channelJoin', fn)
    }

    onChannelLeave(fn: (handler: Actions, opts: BasePayload) => void) {
        this.on('channelLeave', fn)
    }

    onStreamMessage(fn: (handler: Actions, opts: BasePayload & { message: string }) => void) {
        this.on('streamMessage', fn)
    }
    // onSlashCommand(command: Commands, fn: (client: Actions, opts: BasePayload) => void) {
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
        this.emit('streamMessage', this.clientToActions(this.rpcClient), {
            userId: 'bot',
            channelId: 'bot',
            eventId: 'bot',
            message: 'bot',
        })
    }
    private clientToActions(client: Client): Actions {
        return {
            sendReaction: (channelId, messageId, reaction) =>
                client.sendChannelMessage_Reaction(channelId, { refEventId: messageId, reaction }),
            // TODO: hook replyTo
            sendMessage: (channelId, message, opts) =>
                client.sendChannelMessage_Text(channelId, {
                    threadId: opts?.threadId,
                    threadPreview: opts?.threadId ? '🙉' : undefined,
                    replyId: opts?.replyId,
                    replyPreview: opts?.replyId ? '🙈' : undefined,
                    content: {
                        body: message,
                        mentions: opts?.mentions ?? [],
                        attachments: opts?.attachments ?? [],
                    },
                }),
            editMessage: (channelId, messageId, message) =>
                client.sendChannelMessage_Edit_Text(channelId, messageId, {
                    content: new ChannelMessage_Post_Content_Text({ body: message }),
                }),
            sendDm: (channelId, message, opts) =>
                client.sendChannelMessage_Text(channelId, {
                    threadId: opts?.threadId,
                    threadPreview: opts?.threadId ? '🙉' : undefined,
                    replyId: opts?.replyId,
                    replyPreview: opts?.replyId ? '🙈' : undefined,
                    content: {
                        body: message,
                        mentions: opts?.mentions ?? [],
                        attachments: opts?.attachments ?? [],
                    },
                }),
            // TODO: polish this one, since it interacts on-chain.
            // should this call the transfer and submit the receipt?
            // or should it only submit the receipt?
            sendTip: (userId, eventId) => {},
        }
    }
}

export const makeTownsBot = async (privateKey: string, config: RiverConfig) => {
    const signerContext = await buildBotWallet(privateKey)
    const riverProvider = makeRiverProvider(config)
    const riverRegistryDapp = new RiverRegistry(config.river.chainConfig, riverProvider)
    const urls = await riverRegistryDapp.getOperationalNodeUrls()
    const rpcClient = makeStreamRpcClient(urls, riverRegistryDapp.getOperationalNodeUrls)
    return new Bot(signerContext, rpcClient, config)
}
