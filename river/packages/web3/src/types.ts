import { BigNumberish } from 'ethers'

export interface SpaceInfo {
    address: string
    createdAt: BigNumberish
    networkId: string
    name: string
    owner: string
    disabled: boolean
    shortDescription: string
    longDescription: string
    tokenId: BigNumberish
    uri: string
}
