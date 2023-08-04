/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
    AuthenticationData,
    LoginTypePublicKey,
    LoginTypePublicKeyEthereum,
    RegisterRequest,
} from '../../../src/hooks/login'
import {
    RoomMessageEvent,
    RoomRedactionEvent,
    TimelineEvent,
    TimelineEvent_OneOf,
    ZTEvent,
} from '../../../src/types/timeline-types'
import {
    SpaceProtocol,
    TransactionStatus,
    MatrixAuth,
    ZionClientEventHandlers,
} from '../../../src/client/ZionClientTypes'
import { UserIdentifier, createUserIdFromEthereumAddress } from '../../../src/types/user-identifier'

import { CreateSpaceInfo } from '../../../src/types/zion-types'
import { Permission } from '../../../src/client/web3/ContractTypes'
import { RoleIdentifier } from '../../../src/types/web3-types'
import { RoomIdentifier } from '../../../src/types/room-identifier'
import { SpaceFactoryDataTypes } from '../../../src/client/web3/shims/SpaceFactoryShim'
import { ZionClient } from '../../../src/client/ZionClient'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { createMessageToSign } from '../../../src/hooks/use-matrix-wallet-sign-in'
import { ethers } from 'ethers'
import { getPrimaryProtocol, makeUniqueName } from './TestUtils'
import { staticAssertNever } from '../../../src/utils/zion-utils'
import { toEvent as toEventFromMatrixEvent } from '../../../src/hooks/ZionContext/useMatrixTimelines'
import { toEvent as toEventFromCasablancaEvent } from '../../../src/hooks/ZionContext/useCasablancaTimelines'
import { newMatrixLoginSession, newMatrixRegisterSession } from '../../../src/hooks/session'
import { MatrixClient } from 'matrix-js-sdk'
import { Client as CasablancaClient } from '@towns/sdk'

export interface ZionTestClientProps {
    primaryProtocol?: SpaceProtocol
    eventHandlers?: ZionClientEventHandlers
    smartContractVersion?: string
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

    public matrixClient?: MatrixClient = undefined // override base class to be public for tests
    public casablancaClient?: CasablancaClient = undefined // override base class to be public for tests

    public props?: ZionTestClientProps
    public provider: ZionTestWeb3Provider
    public get wallet(): ethers.Wallet {
        return this.provider.wallet
    }
    public delegateWallet: ethers.Wallet
    public get walletAddress(): string | undefined {
        return this.userIdentifier?.accountAddress
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
                primaryProtocol: props?.primaryProtocol ?? getPrimaryProtocol(),
                matrixServerUrl: process.env.HOMESERVER!,
                casablancaServerUrl: process.env.CASABLANCA_SERVER_URL!,
                chainId,
                initialSyncLimit: 20,
                web3Provider: provider,
                eventHandlers: props?.eventHandlers,
                verbose: true,
                smartContractVersion: props?.smartContractVersion,
            },
            name,
        )
        this.props = props
        // initialize our provider that wraps our wallet and chain communication
        this.provider = provider
        // matrix user identifier
        this.userIdentifier = createUserIdFromEthereumAddress(
            this.provider.wallet.address,
            this.chainId,
        )
        // casablanca delegate wallet
        this.delegateWallet = ethers.Wallet.createRandom()

        // add ourselves to the list of all clients
        ZionTestClient.allClients.push(this)
    }

    /************************************************
     * createSpace for testing
     *************************************************/
    public async createSpace(
        createSpaceInfo: CreateSpaceInfo,
        memberEntitlements: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct,
        everyonePermissions: Permission[],
    ): Promise<RoomIdentifier | undefined> {
        const txContext = await this.createSpaceTransaction(
            createSpaceInfo,
            memberEntitlements,
            everyonePermissions,
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
            return rxContext.data
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
        tokens: SpaceFactoryDataTypes.ExternalTokenStruct[],
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
            return rxContext.data
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
        return `${this.name}${pre}_${post}@${this.auth?.deviceId ?? 'unset'}`
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

    /// register this users wallet with the matrix server
    /// a.ellis, would be nice if this used the same code as the web client
    public async registerMatrixWallet() {
        if (this.auth) {
            throw new Error('already registered')
        }

        const matrixClient = ZionClient.createMatrixClient(this.opts)
        // create a registration request, this reaches out to our server and sets up a session
        // and passes back info on about the server
        const { sessionId, chainIds, error } = await newMatrixRegisterSession(
            matrixClient,
            this.provider.wallet.address,
        )

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
        const auth = await this.registerWithMatrix(request)

        this.log(
            'registered, matrixUserIdLocalpart: ',
            this.userIdentifier.matrixUserIdLocalpart,
            'userId: ',
            auth.userId,
        )
        return auth
    }

    // Helper function to get a test client up and running.
    // Registers a new user and starts the client.
    public async registerWalletAndStartClient() {
        console.log('registerWalletAndStartClient', this.name, this.opts)

        if (this.auth) {
            throw new Error('AUTHED!!')
        }

        if (this.opts.primaryProtocol === SpaceProtocol.Matrix) {
            const myAuth = await this.registerMatrixWallet()
            await this.startMatrixClient(myAuth)
        } else if (this.opts.primaryProtocol === SpaceProtocol.Casablanca) {
            const casablancaContext = await this.signCasablancaDelegate(
                this.delegateWallet,
                this.provider.wallet,
            )
            await this.startCasablancaClient(casablancaContext)
        }
    }

    /// login to the matrix server with wallet account
    public async loginToMatrixWithTestWallet(): Promise<MatrixAuth> {
        if (this.opts.primaryProtocol !== SpaceProtocol.Matrix) {
            throw new Error('loginToMatrixWithTestWallet called when not using matrix')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        const { sessionId, chainIds } = await newMatrixLoginSession(matrixClient)

        // make sure the server supports our chainId
        if (!chainIds.find((x) => x == this.chainId)) {
            throw new Error(`ChainId ${this.chainId} not found`)
        }

        const messageToSign = createMessageToSign({
            walletAddress: this.userIdentifier.accountAddress,
            chainId: this.userIdentifier.chainId,
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

        return await this.loginToMatrix(authRequest)
    }

    /**
     * registerWithMatrix
     * register wallet with matrix, if successful will
     * return params that allow you to call start matrixClient
     */
    public async registerWithMatrix(request: RegisterRequest): Promise<MatrixAuth> {
        if (this.auth) {
            throw new Error('already registered')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        const { access_token, device_id, user_id } = await matrixClient.registerRequest(
            request,
            LoginTypePublicKey,
        )
        if (!access_token || !device_id || !user_id) {
            throw new Error('failed to register')
        }
        this._eventHandlers?.onRegister?.({
            userId: user_id,
        })
        return {
            accessToken: access_token,
            deviceId: device_id,
            userId: user_id,
        }
    }

    /**
     * loginToMatrix
     * set up a login request, will fail if
     * our wallet is NOT registered
     */
    public async loginToMatrix(auth: AuthenticationData): Promise<MatrixAuth> {
        if (this.auth) {
            throw new Error('already logged in')
        }
        const matrixClient = ZionClient.createMatrixClient(this.opts)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { access_token, device_id, user_id } = await matrixClient.login(LoginTypePublicKey, {
            auth,
        })
        if (!access_token || !device_id || !user_id) {
            throw new Error('failed to login')
        }

        this._eventHandlers?.onLogin?.({
            userId: user_id as string,
        })

        return {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            accessToken: access_token,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            deviceId: device_id,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            userId: user_id,
        }
    }

    public async loginWalletAndStartClient(): Promise<void> {
        switch (this.opts.primaryProtocol) {
            case SpaceProtocol.Matrix:
                {
                    let myAuth = this.auth
                    if (!myAuth) {
                        myAuth = await this.loginToMatrixWithTestWallet()
                    }
                    await this.startMatrixClient(myAuth)
                }
                break
            case SpaceProtocol.Casablanca:
                {
                    const casablancaContext = await this.signCasablancaDelegate(
                        this.delegateWallet,
                        this.provider.wallet,
                    )
                    await this.startCasablancaClient(casablancaContext)
                }
                break
            default:
                staticAssertNever(this.opts.primaryProtocol)
        }
    }

    public async isUserRegistered(): Promise<boolean> {
        switch (this.opts.primaryProtocol) {
            case SpaceProtocol.Matrix: {
                const matrixClient = ZionClient.createMatrixClient(this.opts)
                const isAvailable = await matrixClient.isUsernameAvailable(
                    this.userIdentifier.matrixUserIdLocalpart,
                )
                // If the username is available, then it is not yet registered.
                return isAvailable === false
            }
            case SpaceProtocol.Casablanca: {
                return false // n/a for casablanca
            }
            default:
                staticAssertNever(this.opts.primaryProtocol)
        }
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
    public getEvents(roomId: RoomIdentifier): TimelineEvent[] {
        switch (roomId.protocol) {
            case SpaceProtocol.Matrix: {
                if (!this.matrixClient) {
                    return []
                }
                const userId = this.matrixClient.getUserId()
                if (!userId) {
                    return []
                }
                const events =
                    this.matrixClient
                        .getRoom(roomId.networkId)
                        ?.getLiveTimeline()
                        .getEvents()
                        .map((e) => toEventFromMatrixEvent(e, userId)) ?? []
                return events
            }
            case SpaceProtocol.Casablanca: {
                if (!this.casablancaClient) {
                    throw new Error('casablanca client is undefined')
                }
                const stream = this.casablancaClient.stream(roomId.networkId)
                const userId = this.casablancaClient.userId
                const events = Array.from(stream?.view.events.values() ?? []).map((e) =>
                    toEventFromCasablancaEvent(e, userId),
                )
                return events
            }
            default:
                staticAssertNever(roomId)
        }
    }

    public getEventsOfType(roomId: RoomIdentifier, eventType: ZTEvent): TimelineEvent[] {
        return this.getEvents(roomId).filter((e) => e?.content?.kind === eventType)
    }

    public getEvents_Typed<T extends TimelineEvent_OneOf>(
        roomId: RoomIdentifier,
        eventType: T['kind'], // I can force you to pass the right type, but can't figure it out at runtime 🙈
    ): (Omit<TimelineEvent, 'content'> & {
        content: T
    })[] {
        const events = this.getEventsOfType(roomId, eventType)
        return events.map((e) => e as Omit<TimelineEvent, 'content'> & { content: T })
    }

    public getEvents_TypedRoomMessage(roomId: RoomIdentifier) {
        return this.getEvents_Typed<RoomMessageEvent>(roomId, ZTEvent.RoomMessage)
    }

    public getMessages(roomId: RoomIdentifier): string[] {
        const messages = this.getEvents_Typed<RoomMessageEvent>(roomId, ZTEvent.RoomMessage)
        const redactions = new Set(
            this.getEvents_Typed<RoomRedactionEvent>(roomId, ZTEvent.RoomRedaction)
                .map((e) => e.content.inReplyTo)
                .filter((e) => e),
        )
        return messages.filter((e) => !redactions.has(e.eventId)).map((e) => e.content.body)
    }

    public async getLatestEvent<T extends TimelineEvent_OneOf>(
        roomId: RoomIdentifier,
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

    public logEvents(roomId: RoomIdentifier) {
        this.log(`events for ${roomId.networkId}`, this.getEventsDescription(roomId))
    }

    public getEventsDescription(roomId: RoomIdentifier): string {
        const events = this.getEvents(roomId)
        return events.map((e) => `${e.fallbackContent} : ${e.eventId}`).join('\n')
    }
}
