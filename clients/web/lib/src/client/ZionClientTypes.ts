/* eslint-disable @typescript-eslint/no-explicit-any */
import { BigNumberish, ethers } from 'ethers'

export interface ZionOpts {
    homeServerUrl: string
    initialSyncLimit: number
    onboardingOpts?: ZionOnboardingOpts
    disableEncryption?: boolean
    web3Provider?: ethers.providers.Provider
    web3Signer?: ethers.Signer
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
    name: string
    id: BigNumberish
    key: string
}

export interface Space {
    spaceId: BigNumberish
    name: string
    createdAt: Date
    creatorAddress: string
    ownerAddress: string
}

export enum ZionClientEvent {
    NewSpace = 'ZionClient.NewSpace',
}

export interface IZionServerVersions {
    versions: string[]
    unstable_features: Record<string, boolean>
    release_version: string
}
