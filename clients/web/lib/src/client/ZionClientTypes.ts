/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumberish, ContractReceipt, ContractTransaction, ethers } from 'ethers'
import { TProvider } from 'types/web3-types'
import { CreateSpaceInfo, SendMessageOptions } from 'types/zion-types'

import { RoomIdentifier } from '../types/room-identifier'

export enum SpaceProtocol {
    Matrix = 'matrix',
    Casablanca = 'casablanca',
}

export interface ZionOpts {
    primaryProtocol: SpaceProtocol
    matrixServerUrl: string
    casablancaServerUrl: string
    initialSyncLimit: number
    onboardingOpts?: ZionOnboardingOpts
    web3Provider?: TProvider
    web3Signer?: ethers.Signer
    eventHandlers?: ZionClientEventHandlers
}

export interface ZionAuth {
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
}

export enum ZionAccountDataType {
    FullyRead = 'zion.fullyRead',
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

export interface ChannelTransactionContext extends TransactionContext<RoomIdentifier> {
    parentSpaceId: string | undefined
}

export type ZionClientEventHandlers = {
    onCreateSpace?: (createSpaceInfo: CreateSpaceInfo, roomIdentifier: RoomIdentifier) => void
    onInviteUser?: (roomId: RoomIdentifier, userId: string) => void
    onJoinRoom?: (roomId: RoomIdentifier) => void
    onSendMessage?: (roomId: RoomIdentifier, sendMessageOptions?: SendMessageOptions) => void
    onLogin?: (auth: { userId: string }) => void
    onLogout?: (auth: { userId: string }) => void
}
