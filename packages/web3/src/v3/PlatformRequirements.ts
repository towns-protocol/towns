import {
    PlatformRequirementsFacet as LocalhostContract,
    PlatformRequirementsFacetInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/PlatformRequirementsFacet'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/PlatformRequirementsFacet.abi.json' with { type: 'json' }

export class PlatformRequirements extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
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
