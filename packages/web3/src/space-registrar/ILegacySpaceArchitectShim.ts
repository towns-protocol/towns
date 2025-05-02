import { ILegacyArchitectBase as LocalhostILegacySpaceArchitectBase } from '@towns-protocol/generated/dev/typings/IMockLegacyArchitect.sol/ILegacyArchitect'

import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { ILegacyArchitect__factory } from '@towns-protocol/generated/dev/typings/factories/IMockLegacyArchitect.sol/ILegacyArchitect__factory'

export type { LocalhostILegacySpaceArchitectBase as ILegacyArchitectBase }

export class ILegacySpaceArchitectShim extends BaseContractShim<
    ContractType<typeof ILegacyArchitect__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, ILegacyArchitect__factory.connect.bind(ILegacyArchitect__factory))
    }
}
