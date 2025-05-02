import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IMembershipMetadata__factory } from '@towns-protocol/generated/dev/typings/factories/IMembershipMetadata__factory'
import { ContractType } from '../types/typechain'

export class IMembershipMetadataShim extends BaseContractShim<
    ContractType<typeof IMembershipMetadata__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            IMembershipMetadata__factory.connect.bind(IMembershipMetadata__factory),
        )
    }
}
