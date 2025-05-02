import {
    IMembershipBase as LocalhostIMembershipBase,
    IArchitectBase as LocalhostISpaceArchitectBase,
} from '@towns-protocol/generated/dev/typings/ICreateSpace'

import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { ICreateSpace__factory } from '@towns-protocol/generated/dev/typings/factories/ICreateSpace__factory'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostISpaceArchitectBase as IArchitectBase }

export class ICreateSpaceShim extends BaseContractShim<
    ContractType<typeof ICreateSpace__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, ICreateSpace__factory.connect.bind(ICreateSpace__factory))
    }
}
