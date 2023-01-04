/* eslint-disable @typescript-eslint/no-explicit-any */

import { BigNumber, BigNumberish, ContractReceipt, ContractTransaction, ethers } from 'ethers'

// todo: remove this when contract migration is complete
export enum ContractVersion {
    V1 = 'v1',
    V2 = 'v2',
}

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
    web3Provider?: ethers.providers.Provider
    web3Signer?: ethers.Signer
    contractVersion?: ContractVersion // todo: remove this when contract migration is complete
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
    spaceId: BigNumber
    networkId: string
    createdAt: BigNumber
    name: string
    creator: string
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
