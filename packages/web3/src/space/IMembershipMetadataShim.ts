import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IMembershipMetadata__factory } from '@towns-protocol/generated/dev/typings/factories/IMembershipMetadata__factory'

const { abi, connect } = IMembershipMetadata__factory

export class IMembershipMetadataShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
