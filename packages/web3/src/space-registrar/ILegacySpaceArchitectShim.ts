import { ILegacyArchitectBase as LocalhostILegacySpaceArchitectBase } from '@towns-protocol/generated/dev/typings/IMockLegacyArchitect.sol/ILegacyArchitect'

import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { MockLegacyArchitect__factory } from '@towns-protocol/generated/dev/typings/factories/MockLegacyArchitect__factory'

export type { LocalhostILegacySpaceArchitectBase as ILegacyArchitectBase }

const { abi, connect } = MockLegacyArchitect__factory

export class ILegacySpaceArchitectShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
