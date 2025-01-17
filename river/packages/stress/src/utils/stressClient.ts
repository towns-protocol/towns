import {
    Client as StreamsClient,
    RiverConfig,
    Bot,
    SyncAgent,
    spaceIdFromChannelId,
} from '@river-build/sdk'
import { type ExportedDevice } from '@river-build/encryption'
import { LocalhostWeb3Provider, SpaceDapp } from '@river-build/web3'
import { shortenHexString } from '@river-build/dlog'
import { Wallet } from 'ethers'
import { PlainMessage } from '@bufbuild/protobuf'
import { ChannelMessage_Post_Attachment, ChannelMessage_Post_Mention } from '@river-build/proto'
import { waitFor } from './waitFor'
import { IStorage } from './storage'
import { sha256 } from 'ethers/lib/utils'
import { getLogger } from './logger'

export async function makeStressClient(
    config: RiverConfig,
    clientIndex: number,
    inWallet: Wallet | undefined,
    globalPersistedStore: IStorage | undefined,
) {
    const bot = new Bot(inWallet, config)
    const storageKey = `stressclient_${bot.userId}_${config.environmentId}`
    const logger = getLogger('stress:makeStressClient', {
        clientIndex,
        userId: bot.userId,
        storageKey,
    })
    let device: ExportedDevice | undefined
    const rawDevice = await globalPersistedStore?.get(storageKey).catch(() => undefined)
    if (rawDevice) {
        device = JSON.parse(rawDevice) as ExportedDevice
        logger.info(
            `Device imported from ${storageKey}, outboundSessions: ${device.outboundSessions.length} inboundSessions: ${device.inboundSessions.length}`,
        )
    }
    const botPrivateKey = bot.rootWallet.privateKey
    const agent = await bot.makeSyncAgent({
        disablePersistenceStore: true,
        unpackEnvelopeOpts: {
            disableHashValidation: true,
            disableSignatureValidation: true,
        },
        encryptionDevice: {
            fromExportedDevice: device,
            pickleKey: sha256(botPrivateKey),
        },
    })
    await agent.start()

    const streamsClient = agent.riverConnection.client
    if (!streamsClient) {
        throw new Error('streamsClient not initialized')
    }

    return new StressClient(
        config,
        clientIndex,
        bot.userId,
        bot.web3Provider,
        bot,
        agent,
        agent.riverConnection.spaceDapp,
        streamsClient,
        globalPersistedStore,
        storageKey,
    )
}

export class StressClient {
    logger: ReturnType<typeof getLogger>

    constructor(
        public config: RiverConfig,
        public clientIndex: number,
        public userId: string,
        public baseProvider: LocalhostWeb3Provider,
        public bot: Bot,
        public agent: SyncAgent,
        public spaceDapp: SpaceDapp,
        public streamsClient: StreamsClient,
        public globalPersistedStore: IStorage | undefined,
        public storageKey: string,
    ) {
        this.logger = getLogger('stress:stressClient', {
            clientIndex,
            userId,
            logId: this.logId,
            rpcUrl: this.streamsClient.rpcClient.url,
        })
    }

    get logId(): string {
        return `client${this.clientIndex}:${shortenHexString(this.userId)}`
    }

    async fundWallet() {
        await this.bot.fundWallet()
    }

    async waitFor<T>(
        condition: () => T | Promise<T>,
        opts?: {
            interval?: number
            timeoutMs?: number
            logId?: string
        },
    ) {
        opts = opts ?? {}
        opts.logId = opts.logId ? `${opts.logId}:${this.logId}` : this.logId
        return waitFor(condition, opts)
    }

    userExists(): boolean {
        return this.agent.riverConnection.value.data.userExists
    }

    async isMemberOf(streamId: string): Promise<boolean> {
        const streamsClient = this.agent.riverConnection.client
        if (!streamsClient) {
            return false
        }
        const stream = streamsClient.stream(streamId)
        const streamStateView = stream?.view ?? (await streamsClient.getStream(streamId))
        return streamStateView.userIsEntitledToKeyExchange(this.userId)
    }

    async createSpace(spaceName: string) {
        return this.agent.spaces.createSpace({ spaceName }, this.bot.signer)
    }

    async createChannel(spaceId: string, channelName: string) {
        const space = this.agent.spaces.getSpace(spaceId)
        return space.createChannel(channelName, this.bot.signer)
    }

    async sendMessage(
        channelId: string,
        message: string,
        options?: {
            threadId?: string
            replyId?: string
            mentions?: PlainMessage<ChannelMessage_Post_Mention>[]
            attachments?: PlainMessage<ChannelMessage_Post_Attachment>[]
        },
    ) {
        const spaceId = spaceIdFromChannelId(channelId)
        const space = this.agent.spaces.getSpace(spaceId)
        const channel = space.getChannel(channelId)
        return channel.sendMessage(message, options)
    }

    async sendReaction(channelId: string, refEventId: string, reaction: string) {
        const spaceId = spaceIdFromChannelId(channelId)
        const space = this.agent.spaces.getSpace(spaceId)
        const channel = space.getChannel(channelId)
        return channel.sendReaction(refEventId, reaction)
    }

    async joinSpace(spaceId: string, opts?: { skipMintMembership?: boolean }) {
        const space = this.agent.spaces.getSpace(spaceId)
        return space.join(this.bot.signer, opts)
    }

    async stop() {
        await this.exportDevice()
        await this.agent.stop()
    }

    async exportDevice(): Promise<ExportedDevice | undefined> {
        const device = await this.agent.riverConnection.client?.cryptoBackend?.exportDevice()
        if (device) {
            try {
                await this.globalPersistedStore?.set(
                    this.storageKey,
                    JSON.stringify(device, null, 2),
                )
                this.logger.info({ storageKey: this.storageKey }, 'device exported')
            } catch (e) {
                this.logger.error(e, 'failed to export device')
            }
        }
        return device
    }
}
