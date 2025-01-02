/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    RedactionActionEvent,
    ChannelMessageEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
} from '../../../src/types/timeline-types'
import {
    TransactionStatus,
    TownsClientEventHandlers,
    TownsOpts,
} from '../../../src/client/TownsClientTypes'

import { CreateSpaceInfo, StreamView } from '../../../src/types/towns-types'
import { RoleIdentifier } from '../../../src/types/web3-types'
import { TownsClient } from '../../../src/client/TownsClient'
import { TownsTestWeb3Provider } from './TownsTestWeb3Provider'
import { ethers } from 'ethers'
import { makeUniqueName } from './TestUtils'
import { toEvent } from '../../../src/hooks/TownsContext/useCasablancaTimelines'
import {
    Client as CasablancaClient,
    RiverTimelineEvent,
    SignerContext,
    UnauthenticatedClient,
    makeRiverRpcClient,
    makeSignerContext,
    userIdFromAddress,
} from '@river-build/sdk'
import {
    Permission,
    MembershipStruct,
    IRuleEntitlementV2Base,
    createSpaceDapp,
} from '@river-build/web3'
import { bin_fromHexString } from '@river-build/dlog'

import { foundry } from 'viem/chains'

export interface TownsTestClientProps {
    eventHandlers?: TownsClientEventHandlers
    accountAbstractionConfig?: TownsOpts['accountAbstractionConfig']
}

export class TownsTestClient extends TownsClient {
    static allClients: TownsTestClient[] = []
    static async cleanup() {
        console.log(
            '========= TownsTestClient: cleanup =========',
            this.allClients.map((x) => x.getLoggingIdentifier()),
        )
        await Promise.all(this.allClients.map((client) => client.stopClients()))
        this.allClients = []
        console.log('========= TownsTestClient: cleanup done =========')
    }

    public casablancaClient?: CasablancaClient = undefined // override base class to be public for tests

    public props?: TownsTestClientProps
    public provider: TownsTestWeb3Provider
    public get wallet(): ethers.Wallet {
        return this.provider.wallet
    }
    public delegateWallet: ethers.Wallet
    public get walletAddress(): string | undefined {
        return this.provider.wallet.address
    }
    public get userId(): string {
        return userIdFromAddress(bin_fromHexString(this.provider.wallet.address))
    }

    constructor(name: string, props?: TownsTestClientProps, wallet?: ethers.Wallet) {
        const provider = new TownsTestWeb3Provider(wallet)
        const spaceDapp = createSpaceDapp(provider, provider.config.base.chainConfig)
        // super
        super(
            {
                environmentId: process.env.RIVER_ENV!,
                baseChainId: provider.config.base.chainConfig.chainId,
                baseConfig: provider.config.base.chainConfig,
                baseProvider: provider,
                riverChainId: provider.config.river.chainConfig.chainId,
                riverConfig: provider.config.river.chainConfig,
                riverProvider: provider.riverChainProvider,
                eventHandlers: props?.eventHandlers,
                accountAbstractionConfig: props?.accountAbstractionConfig,
                supportedXChainRpcMapping: {
                    [foundry.id]: String(foundry.rpcUrls.default.http),
                },
                verbose: true,
                createLegacySpaces: process.env.CREATE_LEGACY_SPACES === 'true',
            },
            spaceDapp,
            name,
        )
        this.props = props
        // initialize our provider that wraps our wallet and chain communication
        this.provider = provider
        // casablanca delegate wallet
        this.delegateWallet = ethers.Wallet.createRandom()

        // add ourselves to the list of all clients
        TownsTestClient.allClients.push(this)
    }

    /************************************************
     * getUserId
     ************************************************/
    getUserId(): string {
        return this.userId
    }

    /************************************************
     * createSpace for testing
     *************************************************/
    public async createSpace(
        createSpaceInfo: CreateSpaceInfo,
        membership: MembershipStruct,
    ): Promise<string> {
        const signerContext =
            this.signerContext ??
            (await makeSignerContext(this.provider.wallet, this.delegateWallet))
        const txContext = await this.createSpaceTransaction(
            createSpaceInfo,
            membership,
            this.provider.wallet,
        )
        if (txContext.error) {
            throw txContext.error
        }
        if (txContext.status === TransactionStatus.Pending) {
            const rxContext = await this.waitForCreateSpaceTransaction(txContext, signerContext)
            if (rxContext.error) {
                throw rxContext.error
            }
            if (!rxContext.data) {
                throw new Error('createSpaceTransaction has no data')
            }
            if (!rxContext.data.spaceId) {
                throw new Error('createSpaceTransaction has no spaceId')
            }
            return rxContext.data.spaceId
        }
        // Something went wrong. Don't return a room identifier.
        throw new Error('createSpaceTransaction failed')
    }

    public override getSupportedXChainIds(): Promise<number[]> {
        return Promise.resolve([foundry.id])
    }

    public override async joinTown(
        spaceId: string,
        signer: ethers.Signer,
        inSignerContext?: SignerContext | undefined,
    ): Promise<StreamView> {
        const signerContext =
            inSignerContext ?? (await makeSignerContext(signer, this.delegateWallet))
        return super.joinTown(spaceId, signer, signerContext)
    }

    /************************************************
     * createRole for testing
     *************************************************/
    public async createRole(
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        users: string[],
        ruleData: IRuleEntitlementV2Base.RuleDataV2Struct,
    ): Promise<RoleIdentifier | undefined> {
        const txContext = await this.createRoleTransaction(
            spaceNetworkId,
            roleName,
            permissions,
            users,
            ruleData,
            this.provider.wallet,
        )
        if (txContext.error) {
            throw txContext.error
        }
        if (txContext.status === TransactionStatus.Pending) {
            const rxContext = await this.waitForCreateRoleTransaction(txContext)
            return rxContext.data?.roleId
        }
        // Something went wrong. Don't return a room identifier.
        return undefined
    }

    /// log a message to the console with the user's name and part of the wallet address
    public log(message: string, ...optionalParams: unknown[]) {
        console.log(`${this.getLoggingIdentifier()}`, message, ...optionalParams)
    }

    /// return name formatted with readable segment of user id and device id
    public getLoggingIdentifier(): string {
        const accountAddress = ethers.utils.getAddress(this.provider.wallet.address)
        const dx = 6
        const addressLength = accountAddress.length
        const pre = accountAddress.substring(0, dx)
        const post = accountAddress.substring(addressLength - dx)
        return `${this.name}${pre}_${post}`
    }

    /// return a unique name sutable for a space or channel name
    public makeUniqueName(): string {
        return makeUniqueName(this.name)
    }

    /// add some funds to this wallet
    public async fundWallet() {
        await this.provider.fundWallet()
        this.log('funded wallet')
    }

    /// mint a mock NFT. createSpace is gated by this NFT
    public async mintMockNFT(): Promise<void> {
        await this.provider.mintMockNFT()
        this.log('minted mock NFT')
    }

    public async makeSignerContextAndStartClient(): Promise<void> {
        const casablancaContext = await makeSignerContext(this.provider.wallet, this.delegateWallet)
        await this.startCasablancaClient(casablancaContext)
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async isUserRegistered(): Promise<boolean> {
        const rpcClient = await makeRiverRpcClient(
            this.provider.riverChainProvider,
            this.provider.config.river.chainConfig,
        )
        const unauthedClient = new UnauthenticatedClient(rpcClient)
        return unauthedClient.userExists(this.getUserId())
    }

    public async waitForStream(roomId: string): Promise<void> {
        await this.casablancaClient?.waitForStream(roomId)
    }
    /************************************************
     * getLatestEvent
     ************************************************/
    public getEvents(
        roomId: string,
        options?: { excludeMiniblockHeaders?: boolean },
    ): TimelineEvent[] {
        if (!this.casablancaClient) {
            throw new Error('casablanca client is undefined')
        }
        const stream = this.casablancaClient.stream(roomId)
        const userId = this.casablancaClient.userId
        if (!stream) {
            throw new Error('stream is undefined')
        }
        const events = stream.view.timeline.map((event) => {
            return toEvent(event, userId)
        })
        if (options?.excludeMiniblockHeaders === true) {
            return events.filter((x) => x.content?.kind !== RiverTimelineEvent.MiniblockHeader)
        } else {
            return events
        }
    }

    public getEventsOfType(roomId: string, eventType: RiverTimelineEvent): TimelineEvent[] {
        return this.getEvents(roomId).filter((e) => e?.content?.kind === eventType)
    }

    public getEvents_Typed<T extends TimelineEvent_OneOf>(
        roomId: string,
        eventType: T['kind'], // I can force you to pass the right type, but can't figure it out at runtime 🙈
    ): (Omit<TimelineEvent, 'content'> & {
        content: T
    })[] {
        const events = this.getEventsOfType(roomId, eventType)
        return events.map((e) => e as Omit<TimelineEvent, 'content'> & { content: T })
    }

    public getEvents_TypedChannelMessage(roomId: string) {
        return this.getEvents_Typed<ChannelMessageEvent>(roomId, RiverTimelineEvent.ChannelMessage)
    }

    public getMessages(roomId: string): string[] {
        const messages = this.getEvents_Typed<ChannelMessageEvent>(
            roomId,
            RiverTimelineEvent.ChannelMessage,
        )
        const redactions = new Set(
            this.getEvents_Typed<RedactionActionEvent>(
                roomId,
                RiverTimelineEvent.RedactionActionEvent,
            )
                .map((e) => e.content.refEventId)
                .filter((e) => e),
        )
        return messages.filter((e) => !redactions.has(e.eventId)).map((e) => e.content.body)
    }

    public async getLatestEvent<T extends TimelineEvent_OneOf>(
        roomId: string,
        eventType: T['kind'] | undefined = RiverTimelineEvent.ChannelMessage,
    ): Promise<
        | (Omit<TimelineEvent, 'content'> & {
              content: T
          })
        | undefined
    > {
        await this.waitForStream(roomId)
        const events = this.getEvents_Typed(roomId, eventType)
        return events.at(-1)
    }

    public logEvents(roomId: string) {
        this.log(`events for ${roomId}`, this.getEventsDescription(roomId))
    }

    public getEventsDescription(roomId: string): string {
        const events = this.getEvents(roomId)
        return events.map((e) => `${e.fallbackContent} : ${e.eventId}`).join('\n')
    }

    /************************************************
     * stopClients
     *************************************************/
    public async stopClients() {
        this.baseTransactor.userOps?.reset()
        await this.baseTransactor.blockchainTransactionStore.stop()
        await this.stopCasablancaClient()
    }
}
