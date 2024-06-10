import {
    PlatformRequirementsFacet as LocalhostContract,
    PlatformRequirementsFacetInterface as LocalhostInterface,
} from '@river-build/generated/dev/typings/PlatformRequirementsFacet'
import {
    PlatformRequirementsFacet as BaseSepoliaContract,
    PlatformRequirementsFacetInterface as BaseSepoliaInterface,
} from '@river-build/generated/v3/typings/PlatformRequirementsFacet'

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'
import { ContractVersion } from '../IStaticContractsInfo'

import LocalhostAbi from '@river-build/generated/dev/abis/PlatformRequirementsFacet.abi.json' assert { type: 'json' }
import BaseSepoliaAbi from '@river-build/generated/v3/abis/PlatformRequirementsFacet.abi.json' assert { type: 'json' }

export class PlatformRequirements extends BaseContractShim<
    LocalhostContract,
    LocalhostInterface,
    BaseSepoliaContract,
    BaseSepoliaInterface
> {
    constructor(
        address: string,
        version: ContractVersion,
        provider: ethers.providers.Provider | undefined,
    ) {
        super(address, version, provider, {
            [ContractVersion.dev]: LocalhostAbi,
            [ContractVersion.v3]: BaseSepoliaAbi,
        })
    }

    public getMembershipFee() {
        return this.read.getMembershipFee()
    }
}
