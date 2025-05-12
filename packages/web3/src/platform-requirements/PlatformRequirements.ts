import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { PlatformRequirementsFacet__factory } from '@towns-protocol/generated/dev/typings/factories/PlatformRequirementsFacet__factory'

const { abi, connect } = PlatformRequirementsFacet__factory

export class PlatformRequirements extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
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
