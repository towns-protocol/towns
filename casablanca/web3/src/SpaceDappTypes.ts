import { ethers } from 'ethers'

export interface SpaceInfo {
    address: string
    networkId: string
    name: string
    owner: string
    disabled: boolean
}

type ProviderType = ethers.providers.Provider

export type SpaceDappConfig = {
    chainId: number
    provider: ProviderType | undefined
}
