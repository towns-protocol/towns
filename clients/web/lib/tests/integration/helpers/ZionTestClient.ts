/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    RedactionActionEvent,
    RoomMessageEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../../src/types/timeline-types'
import {
    TransactionStatus,
    ZionClientEventHandlers,
    ZionOpts,
} from '../../../src/client/ZionClientTypes'

import { CreateSpaceInfo } from '../../../src/types/zion-types'
import { RoleIdentifier } from '../../../src/types/web3-types'
import { ZionClient } from '../../../src/client/ZionClient'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { ethers } from 'ethers'
import { makeUniqueName } from './TestUtils'
import { toEvent } from '../../../src/hooks/ZionContext/useCasablancaTimelines'
import { Client as CasablancaClient } from '@river/sdk'
import { TokenEntitlementDataTypes, Permission, ITownArchitectBase } from '@river/web3'

export interface ZionTestClientProps {
    eventHandlers?: ZionClientEventHandlers
    accountAbstractionConfig?: ZionOpts['accountAbstractionConfig']
}

export class ZionTestClient extends ZionClient {
    static allClients: ZionTestClient[] = []
    static async cleanup() {
        console.log(
            '========= ZionTestClient: cleanup =========',
            this.allClients.map((x) => x.getLoggingIdentifier()),
        )
        await Promise.all(this.allClients.map((client) => client.stopClients()))
        this.allClients = []
        console.log('========= ZionTestClient: cleanup done =========')
    }

    public casablancaClient?: CasablancaClient = undefined // override base class to be public for tests

    public props?: ZionTestClientProps
    public provider: ZionTestWeb3Provider
    public get wallet(): ethers.Wallet {
        return this.provider.wallet
    }
    public delegateWallet: ethers.Wallet
    public get walletAddress(): string | undefined {
        return this.provider.wallet.address
    }

    constructor(
        chainId: number,
        name: string,
        props?: ZionTestClientProps,
        wallet?: ethers.Wallet,
    ) {
        const provider = new ZionTestWeb3Provider(wallet)
        // super
        super(
            {
                casablancaServerUrl: process.env.CASABLANCA_SERVER_URL!,
                chainId,
                initialSyncLimit: 20,
                web3Provider: provider,
                eventHandlers: props?.eventHandlers,
                accountAbstractionConfig: props?.accountAbstractionConfig,
                verbose: true,
            },
            name,
        )
        this.props = props
        // initialize our provider that wraps our wallet and chain communication
        this.provider = provider
        // casablanca delegate wallet
        this.delegateWallet = ethers.Wallet.createRandom()

        // add ourselves to the list of all clients
        ZionTestClient.allClients.push(this)
    }

    /************************************************
     * getUserId - returns the current user id for the primary protocol, or undefined if not logged in there
     ************************************************/
    getUserId(): string | undefined {
        return this.casablancaClient?.userId
    }

    /************************************************
     * createSpace for testing
     *************************************************/
    public async createSpace(
        createSpaceInfo: CreateSpaceInfo,
        membership: ITownArchitectBase.MembershipStruct,
    ): Promise<string | undefined> {
        const txContext = await this.createSpaceTransaction(
            createSpaceInfo,
            membership,
            this.provider.wallet,
        )
        if (txContext.error) {
            throw txContext.error
        }
        if (txContext.status === TransactionStatus.Pending) {
            const rxContext = await this.waitForCreateSpaceTransaction(txContext)
            if (rxContext.error) {
                throw rxContext.error
            }
            return rxContext.data?.spaceId
        }
        // Something went wrong. Don't return a room identifier.
        return undefined
    }

    /************************************************
     * createRole for testing
     *************************************************/
    public async createRole(
        spaceNetworkId: string,
        roleName: string,
        permissions: Permission[],
        tokens: TokenEntitlementDataTypes.ExternalTokenStruct[],
        users: string[],
    ): Promise<RoleIdentifier | undefined> {
        const txContext = await this.createRoleTransaction(
            spaceNetworkId,
            roleName,
            permissions,
            tokens,
            users,
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

    // Helper function to get a test client up and running.
    // Registers a new user and starts the client.
    public async registerWalletAndStartClient() {
        console.log('registerWalletAndStartClient', this.name, this.opts)

        const casablancaContext = await this.signCasablancaDelegate(
            this.delegateWallet,
            this.provider.wallet,
        )
        await this.startCasablancaClient(casablancaContext)
    }

    public async loginWalletAndStartClient(): Promise<void> {
        const casablancaContext = await this.signCasablancaDelegate(
            this.delegateWallet,
            this.provider.wallet,
        )
        await this.startCasablancaClient(casablancaContext)
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async isUserRegistered(): Promise<boolean> {
        return false // n/a for casablanca
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
            return events.filter((x) => x.content?.kind !== ZTEvent.MiniblockHeader)
        } else {
            return events
        }
    }

    public getEventsOfType(roomId: string, eventType: ZTEvent): TimelineEvent[] {
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

    public getEvents_TypedRoomMessage(roomId: string) {
        return this.getEvents_Typed<RoomMessageEvent>(roomId, ZTEvent.RoomMessage)
    }

    public getMessages(roomId: string): string[] {
        const messages = this.getEvents_Typed<RoomMessageEvent>(roomId, ZTEvent.RoomMessage)
        const redactions = new Set(
            this.getEvents_Typed<RedactionActionEvent>(roomId, ZTEvent.RedactionActionEvent)
                .map((e) => e.content.refEventId)
                .filter((e) => e),
        )
        return messages.filter((e) => !redactions.has(e.eventId)).map((e) => e.content.body)
    }

    public async getLatestEvent<T extends TimelineEvent_OneOf>(
        roomId: string,
        eventType: T['kind'] | undefined = ZTEvent.RoomMessage,
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
}
