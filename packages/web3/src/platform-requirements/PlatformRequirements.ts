import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { PlatformRequirementsFacet__factory } from '@towns-protocol/generated/dev/typings/factories/PlatformRequirementsFacet__factory'
import { ContractType } from '../types/typechain'

export class PlatformRequirements extends BaseContractShim<
    ContractType<typeof PlatformRequirementsFacet__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(
            address,
            provider,
            PlatformRequirementsFacet__factory.connect.bind(PlatformRequirementsFacet__factory),
        )
    }

    public getMembershipMintLimit() {
        return this.read.getMembershipMintLimit()
    }

    public getMembershipFee() {
        return this.read.getMembershipFee()
    }

    public getMembershipMinPrice() {
        return this.read.getMembershipMinPrice()
    }
}
