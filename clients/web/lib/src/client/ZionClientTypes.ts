import { BigNumberish, ContractReceipt, ContractTransaction } from 'ethers'
import { SendMessageOptions, UpdateChannelInfo } from '../types/zion-types'
import { RoleIdentifier, TProvider } from '../types/web3-types'

import { RoomIdentifier } from '../types/room-identifier'

export interface ZionOpts {
    casablancaServerUrl?: string
    chainId: number
    initialSyncLimit?: number
    pollTimeoutMs?: number
    onboardingOpts?: ZionOnboardingOpts
    web3Provider?: TProvider
    eventHandlers?: ZionClientEventHandlers
    logNamespaceFilter?: string
    pushNotificationWorkerUrl?: string
    pushNotificationAuthToken?: string
    verbose?: boolean
}

export interface MatrixAuth {
    userId: string
    accessToken: string
    deviceId: string
}

export interface ZionOnboardingOpts {
    skipUsername?: boolean
    skipAvatar?: boolean
    showWelcomeSpash?: boolean
}

export interface SpaceIdentifier {
    key: string
    networkId: string
    name: string
    owner: string
    disabled: boolean
}

export interface Space {
    spaceId: BigNumberish
    name: string
    createdAt: Date
    creatorAddress: string
    ownerAddress: string
}

export enum ZionClientEvent {
    NewChannel = 'ZionClient.NewChannel',
    NewSpace = 'ZionClient.NewSpace',
    UpdatedChannel = 'ZionClient.UpdatedChannel',
}

export enum ZionAccountDataType {
    FullyRead = 'zion.fullyRead',
    Membership = 'zion.membership',
}

export interface IZionServerVersions {
    versions: string[]
    unstable_features: Record<string, boolean>
    release_version: string
}

export enum TransactionStatus {
    None = 'None',
    Pending = 'Pending',
    Success = 'Success',
    Failed = 'Failed',
}

export interface TransactionContext<T> {
    data: T | undefined
    status: TransactionStatus
    receipt: ContractReceipt | undefined
    transaction: ContractTransaction | undefined
    error?: Error
}

export interface CreateSpaceTransactionContext extends TransactionContext<RoomIdentifier> {
    spaceName?: string
    channelId?: RoomIdentifier
}

export type ChannelTransactionContext = TransactionContext<RoomIdentifier>

export interface ChannelUpdateTransactionContext extends TransactionContext<UpdateChannelInfo> {
    hasOffChainUpdate: boolean // true if this has an off chain update.
}

export interface RoleTransactionContext extends TransactionContext<RoleIdentifier> {
    spaceNetworkId: string | undefined
}

export type ZionClientEventHandlers = {
    onCreateSpace?: (roomId: RoomIdentifier) => void
    onJoinRoom?: (roomId: RoomIdentifier, spaceId: RoomIdentifier) => void
    onSendMessage?: (
        roomId: RoomIdentifier,
        body: string,
        sendMessageOptions?: SendMessageOptions,
    ) => void
    onLogin?: (auth: { userId: string }) => void
    onLogout?: (auth: { userId: string }) => void
    onRegister?: (auth: { userId: string }) => void
}

export function createTransactionContext<T>(props: {
    status: TransactionStatus
    data?: T
    transaction?: ContractTransaction
    receipt?: ContractReceipt
    error?: Error
}): TransactionContext<T> {
    return {
        status: props.status,
        data: props.data,
        transaction: props.transaction,
        receipt: props.receipt,
        error: props.error,
    }
}

export function createChannelTransactionContext(props: {
    status: TransactionStatus
    data?: RoomIdentifier
    transaction?: ContractTransaction
    receipt?: ContractReceipt
    error?: Error
}): ChannelTransactionContext {
    return {
        status: props.status,
        data: props.data,
        transaction: props.transaction,
        receipt: props.receipt,
        error: props.error,
    }
}

export function createChannelUpdateTransactionContext(props: {
    status: TransactionStatus
    hasOffChainUpdate: boolean
    data?: UpdateChannelInfo
    transaction?: ContractTransaction
    receipt?: ContractReceipt
    error?: Error
}): ChannelUpdateTransactionContext {
    return {
        status: props.status,
        hasOffChainUpdate: props.hasOffChainUpdate,
        data: props.data,
        transaction: props.transaction,
        receipt: props.receipt,
        error: props.error,
    }
}

export function createRoleTransactionContext(props: {
    status: TransactionStatus
    data?: RoleIdentifier
    spaceNetworkId?: string
    transaction?: ContractTransaction
    receipt?: ContractReceipt
    error?: Error
}): RoleTransactionContext {
    return {
        status: props.status,
        data: props.data,
        spaceNetworkId: props.spaceNetworkId,
        transaction: props.transaction,
        receipt: props.receipt,
        error: props.error,
    }
}

export function logTxnResult(name: string, txn: TransactionContext<unknown>) {
    if (txn.status === TransactionStatus.Success) {
        console.log(`[${name}]`, 'Success', txn.data)
    } else if (txn.status === TransactionStatus.Failed) {
        console.error(`[${name}]`, 'Failed', txn.error)
    }
}
