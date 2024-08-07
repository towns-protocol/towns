/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import {
    Client as StreamsClient,
    RiverConfig,
    makeSpaceStreamId,
    makeDefaultChannelStreamId,
    isDefined,
    makeUserStreamId,
    streamIdAsBytes,
    makeUniqueChannelStreamId,
    SignerContext,
    StreamRpcClient,
} from '@river-build/sdk'
import { makeConnection } from './connection'
import { CryptoStore, EntitlementsDelegate, type ExportedDevice } from '@river-build/encryption'
import {
    ETH_ADDRESS,
    LocalhostWeb3Provider,
    MembershipStruct,
    NoopRuleData,
    Permission,
    SpaceDapp,
    getDynamicPricingModule,
} from '@river-build/web3'
import { dlogger, shortenHexString } from '@river-build/dlog'
import { Wallet } from 'ethers'
import { PlainMessage } from '@bufbuild/protobuf'
import { ChannelMessage_Post_Attachment, ChannelMessage_Post_Mention } from '@river-build/proto'
import { waitFor } from './waitFor'
import { promises as fs } from 'node:fs'
import * as path from 'node:path'
import { sha256 } from 'ethers/lib/utils'
const logger = dlogger('stress:stressClient')

export async function makeStressClient(
    config: RiverConfig,
    clientIndex: number,
    inWallet?: Wallet,
) {
    const { userId, signerContext, baseProvider, riverProvider, rpcClient } = await makeConnection(
        config,
        inWallet,
    )
    const cryptoDb = new CryptoStore(`crypto-${userId}`, userId)
    const spaceDapp = new SpaceDapp(config.base.chainConfig, baseProvider)
    const delegate = {
        isEntitled: async (
            spaceId: string | undefined,
            channelId: string | undefined,
            user: string,
            permission: Permission,
        ) => {
            if (config.environmentId === 'local_single_ne') {
                return true
            } else if (channelId && spaceId) {
                return spaceDapp.isEntitledToChannel(spaceId, channelId, user, permission)
            } else if (spaceId) {
                return spaceDapp.isEntitledToSpace(spaceId, user, permission)
            } else {
                return true
            }
        },
    } satisfies EntitlementsDelegate
    const streamsClient = new StreamsClient(signerContext, rpcClient, cryptoDb, delegate)
    return new StressClient(
        config,
        clientIndex,
        userId,
        signerContext,
        baseProvider,
        riverProvider,
        rpcClient,
        spaceDapp,
        streamsClient,
    )
}

export class StressClient {
    constructor(
        public config: RiverConfig,
        public clientIndex: number,
        public userId: string,
        public signerContext: SignerContext,
        public baseProvider: LocalhostWeb3Provider,
        public riverProvider: LocalhostWeb3Provider,
        public rpcClient: StreamRpcClient,
        public spaceDapp: SpaceDapp,
        public streamsClient: StreamsClient,
    ) {
        logger.log('StressClient', { clientIndex, userId, logId: this.logId })
    }

    get logId(): string {
        return `client${this.clientIndex}:${shortenHexString(this.userId)}`
    }

    get deviceFilePath(): string {
        return path.resolve(`/tmp/device_${this.clientIndex}.json`)
    }

    async fundWallet() {
        await this.baseProvider.fundWallet()
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

    async userExists(inUserId?: string): Promise<boolean> {
        const userId = inUserId ?? this.userId
        const userStreamId = makeUserStreamId(userId)
        const response = await this.streamsClient.rpcClient.getStream({
            streamId: streamIdAsBytes(userStreamId),
            optional: true,
        })
        return response.stream !== undefined
    }

    async isMemberOf(streamId: string, inUserId?: string): Promise<boolean> {
        const userId = inUserId ?? this.userId
        const stream = this.streamsClient.stream(streamId)
        const streamStateView = stream?.view ?? (await this.streamsClient.getStream(streamId))
        return streamStateView.userIsEntitledToKeyExchange(userId)
    }

    async createSpace(spaceName: string) {
        const dynamicPricingModule = await getDynamicPricingModule(this.spaceDapp)
        const membershipInfo = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: this.userId,
                freeAllocation: 0,
                pricingModule: dynamicPricingModule.module,
            },
            permissions: [Permission.Read, Permission.Write],
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
            },
        } satisfies MembershipStruct
        const transaction = await this.spaceDapp.createSpace(
            {
                spaceName,
                uri: '',
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            this.baseProvider.wallet,
        )
        const receipt = await transaction.wait()
        logger.log('transaction receipt', receipt)
        const spaceAddress = this.spaceDapp.getSpaceAddress(receipt)
        if (!spaceAddress) {
            throw new Error('Space address not found')
        }
        logger.log('spaceAddress', spaceAddress)
        const spaceId = makeSpaceStreamId(spaceAddress)
        const defaultChannelId = makeDefaultChannelStreamId(spaceAddress)
        logger.log('spaceId, defaultChannelId', { spaceId, defaultChannelId })
        await this.startStreamsClient({ spaceId })
        await this.streamsClient.createSpace(spaceId)
        await this.streamsClient.createChannel(spaceId, 'general', '', defaultChannelId)
        return { spaceId, defaultChannelId }
    }

    async createChannel(spaceId: string, channelName: string) {
        const channelId = makeUniqueChannelStreamId(spaceId)
        const roles = await this.spaceDapp.getRoles(spaceId)
        const tx = await this.spaceDapp.createChannel(
            spaceId,
            channelName,
            '',
            channelId,
            roles.filter((role) => role.name !== 'Owner').map((role) => role.roleId),
            this.baseProvider.wallet,
        )
        const receipt = await tx.wait()
        logger.log('createChannel receipt', receipt)
        await this.streamsClient.createChannel(spaceId, channelName, '', channelId)
        return channelId
    }

    async startStreamsClient(config: { spaceId?: string }) {
        if (isDefined(this.streamsClient.userStreamId)) {
            return
        }
        let device: ExportedDevice | undefined
        const rawDevice = await fs.readFile(this.deviceFilePath, 'utf8').catch(() => undefined)
        if (rawDevice) {
            device = JSON.parse(rawDevice) as ExportedDevice
            logger.info(
                `Device imported from ${this.deviceFilePath}, outboundSessions: ${device.outboundSessions.length} inboundSessions: ${device.inboundSessions.length}`,
            )
        }
        const botPrivateKey = this.baseProvider.wallet.privateKey
        await this.streamsClient.initializeUser({
            spaceId: config.spaceId,
            encryptionDeviceInit: {
                fromExportedDevice: device,
                pickleKey: sha256(botPrivateKey),
            },
        })
        this.streamsClient.startSync()
        logger.log(
            'streamsClient key',
            this.streamsClient.cryptoBackend?.encryptionDevice.deviceCurve25519Key,
        )
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
        const eventId = await this.streamsClient.sendChannelMessage_Text(channelId, {
            threadId: options?.threadId,
            threadPreview: options?.threadId ? '🙉' : undefined,
            replyId: options?.replyId,
            replyPreview: options?.replyId ? '🙈' : undefined,
            content: {
                body: message,
                mentions: options?.mentions ?? [],
                attachments: [],
            },
        })
        return eventId
    }

    async sendReaction(channelId: string, refEventId: string, reaction: string) {
        const eventId = await this.streamsClient.sendChannelMessage_Reaction(channelId, {
            reaction,
            refEventId,
        })
        return eventId
    }

    async joinSpace(spaceId: string, opts?: { skipMintMembership?: boolean }) {
        if (opts?.skipMintMembership !== true) {
            const { issued } = await this.spaceDapp.joinSpace(
                spaceId,
                this.userId,
                this.baseProvider.wallet,
            )
            logger.log('joinSpace transaction', issued)
        }
        await this.startStreamsClient({ spaceId })
        await this.streamsClient.joinStream(spaceId)
        await this.streamsClient.joinStream(makeDefaultChannelStreamId(spaceId))
    }

    async stop() {
        await this.exportDevice()
        await this.streamsClient.stop()
    }

    async exportDevice(): Promise<ExportedDevice | undefined> {
        const device = await this.streamsClient.cryptoBackend?.encryptionDevice.exportDevice()
        if (device) {
            try {
                await fs.writeFile(this.deviceFilePath, JSON.stringify(device, null, 2))
                logger.log(`Device exported to ${this.deviceFilePath}`)
            } catch (e) {
                logger.error('Failed to export device', e)
            }
        }
        return device
    }
}
