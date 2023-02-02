/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    AuthenticationData,
    LoginTypePublicKey,
    LoginTypePublicKeyEthereum,
    RegisterRequest,
} from '../../../src/hooks/login'

import { RoomIdentifier } from '../../../src/types/room-identifier'
import { ZionClient } from '../../../src/client/ZionClient'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { createMessageToSign } from '../../../src/hooks/use-matrix-wallet-sign-in'
import { createUserIdFromEthereumAddress, UserIdentifier } from '../../../src/types/user-identifier'
import { ethers } from 'ethers'
import { makeUniqueName } from './TestUtils'
import {
    ZionAuth,
    SpaceProtocol,
    ZionClientEventHandlers,
} from '../../../src/client/ZionClientTypes'
import { toZionEventFromCsbEvent } from '../../../src/client/casablanca/CasablancaUtils'
import { toEvent } from '../../../src/hooks/ZionContext/useMatrixTimelines'
import { RoomMessageEvent, TimelineEvent, ZTEvent } from '../../../src/types/timeline-types'
import { staticAssertNever } from '../../../src/utils/zion-utils'

export interface ZionTestClientProps {
    primaryProtocol?: SpaceProtocol
    eventHandlers?: ZionClientEventHandlers
}

export type ZRoomMessageEvent = Omit<TimelineEvent, 'content'> & {
    content: RoomMessageEvent
}

export class ZionTestClient extends ZionClient {
    private userIdentifier: UserIdentifier

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

    public provider: ZionTestWeb3Provider
    public delegateWallet: ethers.Wallet
    public get matrixUserId(): string | undefined {
        return this.auth?.userId
    }

    constructor(
        chainId: number,
        name: string,
        props?: ZionTestClientProps,
        inProvider?: ZionTestWeb3Provider,
        delegateWallet?: ethers.Wallet,
    ) {
        const provider = inProvider ?? new ZionTestWeb3Provider()
        // super
        super(
            {
                primaryProtocol:
                    props?.primaryProtocol ??
                    (process.env.PRIMARY_PROTOCOL as SpaceProtocol) ??
                    SpaceProtocol.Matrix,
                matrixServerUrl: process.env.HOMESERVER!,
                casablancaServerUrl: process.env.CASABLANCA_SERVER_URL!,
                initialSyncLimit: 20,
                web3Signer: provider.wallet,
                web3Provider: provider,
                eventHandlers: props?.eventHandlers,
            },
            chainId,
            name,
        )
        // initialize our provider that wraps our wallet and chain communication
        this.provider = provider
        // matrix user identifier
        this.userIdentifier = createUserIdFromEthereumAddress(
            this.provider.wallet.address,
            this.chainId,
        )
        // casablanca delegate wallet
        this.delegateWallet = delegateWallet ?? ethers.Wallet.createRandom()

        // add ourselves to the list of all clients
        ZionTestClient.allClients.push(this)
    }

    /// log a message to the console with the user's name and part of the wallet address
    protected log(message: string, ...optionalParams: unknown[]) {
        console.log(`${this.getLoggingIdentifier()}`, message, ...optionalParams)
    }

    /// return name formatted with readable segment of user id and device id
    public getLoggingIdentifier(): string {
        const accountAddress = ethers.utils.getAddress(this.provider.wallet.address)
        const dx = 6
        const addressLength = accountAddress.length
        const pre = accountAddress.substring(0, dx)
        const post = accountAddress.substring(addressLength - dx)
        return `${this.name}${pre}_${post}@${this.auth?.deviceId ?? 'unset'}`
    }

    /// return a unique name sutable for a space or channel name
    public makeUniqueName(): string {
        return makeUniqueName(this.name)
    }

    /// add some funds to this wallet
    public async fundWallet(amount = 0.1) {
        await this.provider.fundWallet(amount)
        this.log('funded wallet')
    }

    /// register this users wallet with the matrix server
    /// a.ellis, would be nice if this used the same code as the web client
    public async registerMatrixWallet() {
        // set up some hacky origin varible, no idea how the other code gets this
        const origin = this.opts.matrixServerUrl

        // create a registration request, this reaches out to our server and sets up a session
        // and passes back info on about the server
        const { sessionId, chainIds, error } = await this.preRegister(this.provider.wallet.address)

        // hopefully we didn't get an error
        if (error) {
            throw error
        }

        // make sure the server supports our chainId
        if (!chainIds.find((x) => x == this.chainId)) {
            throw new Error(`ChainId ${this.chainId} not found`)
        }

        const messageToSign = createMessageToSign({
            walletAddress: this.userIdentifier.accountAddress,
            chainId: this.chainId,
            homeServer: this.opts.matrixServerUrl,
            origin,
            statement: 'this is a test registration',
        })

        const signature = await this.provider.wallet.signMessage(messageToSign)

        const request: RegisterRequest = {
            auth: {
                type: LoginTypePublicKey,
                session: sessionId,
                public_key_response: {
                    type: LoginTypePublicKeyEthereum,
                    session: sessionId,
                    message: messageToSign,
                    signature,
                    user_id: this.userIdentifier.matrixUserIdLocalpart,
                },
            },
            username: this.userIdentifier.matrixUserIdLocalpart,
        }

        // register the user
        const auth = await this.register(request)

        this.log(
            'registered, matrixUserIdLocalpart: ',
            this.userIdentifier.matrixUserIdLocalpart,
            'userId: ',
            auth.userId,
        )
        return auth
    }

    /// helper function to get a test client up and running
    public async registerWalletAndStartClient() {
        if (this.auth) {
            throw new Error('AUTHED!!')
        }
        const myAuth = await this.registerMatrixWallet()
        const chainId = (await this.provider.getNetwork()).chainId
        await this.startMatrixClient(myAuth, chainId)

        const casablancaContext = await this.signCasablancaDelegate(this.delegateWallet)
        await this.startCasablancaClient(casablancaContext)
    }

    /// login to the matrix server with wallet account
    public async loginWallet(): Promise<ZionAuth> {
        const { sessionId, chainIds } = await this.newLoginSession()

        // make sure the server supports our chainId
        if (!chainIds.find((x) => x == this.chainId)) {
            throw new Error(`ChainId ${this.chainId} not found`)
        }

        const messageToSign = createMessageToSign({
            walletAddress: this.userIdentifier.accountAddress,
            chainId: this.userIdentifier.chainId,
            homeServer: this.opts.matrixServerUrl,
            origin,
            statement: 'this is a test login',
        })

        const signature = await this.provider.wallet.signMessage(messageToSign)

        // Send the signed message and auth data to the server.
        const authRequest: AuthenticationData = {
            type: LoginTypePublicKeyEthereum,
            session: sessionId,
            message: messageToSign,
            signature,
            user_id: this.userIdentifier.matrixUserIdLocalpart,
        }

        return await this.login(authRequest)
    }

    public async loginWalletAndStartClient(): Promise<void> {
        let myAuth = this.auth
        if (!myAuth) {
            myAuth = await this.loginWallet()
        }
        await this.startMatrixClient(myAuth, this.provider.network.chainId)

        const casablancaContext = await this.signCasablancaDelegate(this.delegateWallet)
        await this.startCasablancaClient(casablancaContext)
    }

    /// set the room invite level
    public async setRoomInviteLevel(roomId: RoomIdentifier, level: number) {
        const response = await this.setPowerLevel(roomId, 'invite', level)
        console.log('setRoomInviteLevel', response)
    }

    public async isUserRegistered(): Promise<boolean> {
        return await super.isUserRegistered(this.userIdentifier.matrixUserIdLocalpart)
    }

    public async waitForStream(roomId: RoomIdentifier): Promise<void> {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix:
                return
            case SpaceProtocol.Casablanca:
                await this.casablancaClient?.waitForStream(roomId.networkId)
                return
            default:
                staticAssertNever(roomId)
        }
    }
    /************************************************
     * getLatestEvent
     ************************************************/
    public getEvents(roomId: RoomIdentifier, eventType?: ZTEvent): TimelineEvent[] {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    throw new Error('matrix client is undefined')
                }
                const userId = this.matrixClient.getUserId()
                if (!userId) {
                    throw new Error('userId is undefined')
                }
                const events =
                    this.matrixClient
                        .getRoom(roomId.networkId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .map((e) => toEvent(e, userId)) ?? []
                if (eventType) {
                    return events.filter((e) => e?.content?.kind === eventType)
                }
                return events
            }
            case SpaceProtocol.Casablanca: {
                if (!this.casablancaClient) {
                    throw new Error('casablanca client is undefined')
                }
                const stream = this.casablancaClient.stream(roomId.networkId)
                const events = Array.from(stream?.rollup.events.values() ?? []).map((e) =>
                    toZionEventFromCsbEvent(e),
                )
                if (eventType) {
                    return events.filter((e) => e?.content?.kind === eventType)
                }
                return events
            }
            default:
                staticAssertNever(roomId)
        }
    }

    public getEvents_TypedRoomMessage(roomId: RoomIdentifier): ZRoomMessageEvent[] {
        const events = this.getEvents(roomId, ZTEvent.RoomMessage)
        return events.map((e) => e as ZRoomMessageEvent)
    }

    public async getLatestEvent(
        roomId: RoomIdentifier,
        eventType: ZTEvent | undefined = ZTEvent.RoomMessage,
    ): Promise<TimelineEvent | undefined> {
        await this.waitForStream(roomId)
        const events = this.getEvents(roomId, eventType)
        return events.at(-1)
    }
}
