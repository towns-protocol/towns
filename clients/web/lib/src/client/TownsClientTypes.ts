import { BigNumberish, ContractReceipt } from 'ethers'
import { SendMessageOptions, UpdateChannelInfo } from '../types/towns-types'
import { RoleIdentifier, TProvider, TransactionOrUserOperation } from '../types/web3-types'
import { Address, BaseChainConfig, RiverChainConfig, XchainConfig } from '@river-build/web3'
import { AccountAbstractionConfig } from '@towns/userops'
import { TownsAnalytics } from 'types/TownsAnalytics'
import { UnpackEnvelopeOpts } from '@river-build/sdk'
import { TownsReviewParams as UserOpsTownsReviewParams } from '@towns/userops'

export interface TownsOpts {
    environmentId: string
    baseChainId: number
    baseConfig: BaseChainConfig
    baseProvider: TProvider
    riverChainId: number
    riverConfig: RiverChainConfig
    xchainConfig: XchainConfig
    riverProvider?: TProvider
    eventHandlers?: TownsClientEventHandlers
    logNamespaceFilter?: string
    verbose?: boolean
    accountAbstractionConfig?: AccountAbstractionConfig
    highPriorityStreamIds?: string[]
    unpackEnvelopeOpts?: UnpackEnvelopeOpts
    ethMainnetRpcUrl?: string
    analytics?: TownsAnalytics
    createLegacySpaces?: boolean
    useModifySync?: boolean
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

export type TransferAssetsData =
    | {
          // transfer nft/token
          contractAddress: Address
          tokenId: string
          recipient: Address
          spaceAddress?: Address
          value?: never
      }
    | {
          // treasury withdraw
          contractAddress?: Address
          tokenId?: never
          spaceAddress: Address
          value?: never
          recipient: Address
      }
    | {
          // transfer eth
          contractAddress?: Address
          tokenId?: never
          spaceAddress?: Address
          value: bigint
          recipient: Address
      }

export type TransferAssetTransactionContext = TransactionContext<
    {
        assetLabel?: string
    } & TransferAssetsData
>

export type CreateSpaceTransactionContext = TransactionContext<{
    spaceName?: string
    spaceId?: string
    channelId?: string
    senderAddress: string
}>

export type ChannelTransactionContext = TransactionContext<string>

export type ChannelUpdateTransactionContext = TransactionContext<UpdateChannelInfo>

export type RoleTransactionContext = TransactionContext<{
    roleId: RoleIdentifier | undefined
    spaceNetworkId: string | undefined
}>

export type WalletLinkTransactionContext = TransactionContext<{
    rootKeyAddress?: string
    walletAddress: string
}>

export type BanUnbanWalletTransactionContext = TransactionContext<{
    spaceId: string
    userId: string
    isBan: boolean
}>

export type PrepayMembershipTransactionContext = TransactionContext<{
    spaceId: string
    supply: number
}>

export type TipTransactionContext = TransactionContext<{
    receiverUsername: string
    messageId: string
    channelId: string
    receiverUserId: string
    senderAddress: string
    spaceId: string
    amount: bigint
    currency: string
}>

export type TownsReviewParams = UserOpsTownsReviewParams
export type ReviewTransactionData = Omit<TownsReviewParams, 'signer'>
export type ReviewTransactionContext = TransactionContext<ReviewTransactionData>

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
    JoiningAutojoinChannels = 'joining-autojoin-channels',
    VerifyingMembership = 'verifying-membership',
    AlreadyMember = 'already-member',
    MintingMembership = 'minting-membership',
    MembershipMinted = 'membership-minted',
    Error = 'error',
}

export enum CreateSpaceFlowStatus {
    MintingSpace = 'minting-space',
    CreatingSpace = 'creating-space',
    CreatingChannel = 'creating-channel',
    CreatingUser = 'creating-user',
    Error = 'error',
}
