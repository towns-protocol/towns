import { BigNumberish, ContractReceipt } from 'ethers'
import { SendMessageOptions, UpdateChannelInfo } from '../types/towns-types'
import { RoleIdentifier, TProvider, TransactionOrUserOperation } from '../types/web3-types'
import { BaseChainConfig, RiverChainConfig } from '@river-build/web3'
import { AccountAbstractionConfig } from '@towns/userops'

export interface TownsOpts {
    environmentId: string
    baseChainId: number
    baseConfig: BaseChainConfig
    baseProvider: TProvider
    riverChainId: number
    riverConfig: RiverChainConfig
    riverProvider?: TProvider
    eventHandlers?: TownsClientEventHandlers
    supportedXChainRpcMapping?: {
        [chainId: number]: string
    }
    logNamespaceFilter?: string
    pushNotificationWorkerUrl?: string
    pushNotificationAuthToken?: string
    verbose?: boolean
    accountAbstractionConfig?: AccountAbstractionConfig
    highPriorityStreamIds?: string[]
    ethMainnetRpcUrl?: string
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

export interface ITownsServerVersions {
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

export type TransactionContext<T> =
    | {
          data: T | undefined
          status: TransactionStatus.None | TransactionStatus.Pending | TransactionStatus.Failed
          receipt: undefined
          transaction: TransactionOrUserOperation | undefined
          error?: Error
      }
    | {
          data: T | undefined
          status: TransactionStatus.Success
          receipt: ContractReceipt
          transaction: TransactionOrUserOperation
          error?: undefined
      }

export type CreateSpaceTransactionContext = TransactionContext<{
    spaceName?: string
    spaceId?: string
    channelId?: string
}>

export type ChannelTransactionContext = TransactionContext<string>

export type ChannelUpdateTransactionContext = TransactionContext<UpdateChannelInfo>

export type RoleTransactionContext = TransactionContext<{
    roleId: RoleIdentifier | undefined
    spaceNetworkId: string | undefined
}>

export type WalletLinkTransactionContext = TransactionContext<{
    rootKeyAddress: string
    walletAddress: string
}>

export type BanUnbanWalletTransactionContext = TransactionContext<{
    spaceId: string
    walletAddress: string
    isBan: boolean
}>

export type TownsClientEventHandlers = {
    onCreateSpace?: (roomId: string) => void
    onJoinRoom?: (roomId: string, spaceId: string) => void
    onSendMessage?: (roomId: string, body: string, sendMessageOptions?: SendMessageOptions) => void
    onLogin?: (auth: { userId: string }) => void
    onLogout?: (auth: { userId: string }) => void
    onRegister?: (auth: { userId: string }) => void
}

export function createTransactionContext<T>(props: {
    status: TransactionStatus
    data?: T
    transaction?: TransactionOrUserOperation
    receipt?: ContractReceipt
    error?: Error
}): TransactionContext<T> {
    if (props.status === TransactionStatus.Success) {
        if (props.transaction && props.receipt) {
            return {
                status: props.status,
                data: props.data,
                transaction: props.transaction,
                receipt: props.receipt,
                error: undefined,
            }
        } else {
            throw new Error('Invalid transaction context: missing transaction or receipt')
        }
    }
    return {
        status: props.status,
        data: props.data,
        transaction: props.transaction,
        receipt: undefined,
        error: props.error,
    }
}

export function logTxnResult(name: string, txn: TransactionContext<unknown>) {
    if (txn.status === TransactionStatus.Success) {
        console.log(`[${name}]`, 'Success', txn.data, txn)
    } else if (txn.status === TransactionStatus.Failed) {
        console.error(`[${name}]`, 'Failed', txn.error, txn)
    }
}

export enum JoinFlowStatus {
    JoiningRoom = 'joining-room',
    JoiningDefaultChannel = 'joining-default-channel',
    VerifyingMembership = 'verifying-membership',
    AlreadyMember = 'already-member',
    MintingMembership = 'minting-membership',
    MembershipMinted = 'membership-minted',
    Error = 'error',
}
