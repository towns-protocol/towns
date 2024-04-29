import {
    Client as StreamsClient,
    RiverConfig,
    makeSpaceStreamId,
    makeDefaultChannelStreamId,
    isDefined,
} from '@river/sdk'
import { Connection, makeConnection } from './connection'
import { CryptoStore, EntitlementsDelegate } from '@river-build/encryption'
import {
    ETH_ADDRESS,
    MembershipStruct,
    NoopRuleData,
    Permission,
    SpaceDapp,
    getDynamicPricingModule,
} from '@river-build/web3'
import { dlogger } from '@river-build/dlog'

const logger = dlogger('csb:stress:stressClient')

export async function makeStressClient(config: RiverConfig, inConnection?: Connection) {
    const connection = inConnection ?? (await makeConnection(config))
    const cryptoDb = new CryptoStore(`crypto-${connection.userId}`, connection.userId)
    const spaceDapp = new SpaceDapp(connection.config.base.chainConfig, connection.baseProvider)
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
    const streamsClient = new StreamsClient(
        connection.signerContext,
        connection.rpcClient,
        cryptoDb,
        delegate,
    )
    return new StressClient(config, connection, spaceDapp, streamsClient)
}

export class StressClient {
    constructor(
        public config: RiverConfig,
        public connection: Connection,
        public spaceDapp: SpaceDapp,
        public streamsClient: StreamsClient,
    ) {}

    async fundWallet() {
        await this.connection.baseProvider.fundWallet()
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
                feeRecipient: this.connection.userId,
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
                spaceMetadata: spaceName,
                channelName: 'general', // default channel name
                membership: membershipInfo,
            },
            this.connection.baseProvider.wallet,
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
        await this.startStreamsClient()
        await this.streamsClient.createSpace(spaceId)
        await this.streamsClient.createChannel(spaceId, 'general', '', defaultChannelId)
        return { spaceId, defaultChannelId }
    }

    async startStreamsClient() {
        if (isDefined(this.streamsClient.userStreamId)) {
            return
        }
        await this.streamsClient.initializeUser()
        this.streamsClient.startSync()
    }

    async sendMessage(channelId: string, message: string) {
        await this.streamsClient.sendMessage(channelId, message)
    }

    async joinSpace(spaceId: string) {
        const transaction = await this.spaceDapp.joinSpace(
            spaceId,
            this.connection.wallet.address,
            this.connection.baseProvider.wallet,
        )
        logger.log('joinSpace transaction', transaction)
        const receipt = await transaction.wait()
        logger.log('joinSpace receipt', receipt)
        await this.startStreamsClient()
        await this.streamsClient.joinStream(spaceId)
        await this.streamsClient.joinStream(makeDefaultChannelStreamId(spaceId))
    }

    async stop() {
        await this.streamsClient.stop()
    }
}
