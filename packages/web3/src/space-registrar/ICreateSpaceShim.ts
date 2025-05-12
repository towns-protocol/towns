import {
    IMembershipBase as LocalhostIMembershipBase,
    IArchitectBase as LocalhostISpaceArchitectBase,
} from '@towns-protocol/generated/dev/typings/ICreateSpace'

import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ICreateSpace__factory } from '@towns-protocol/generated/dev/typings/factories/ICreateSpace__factory'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostISpaceArchitectBase as IArchitectBase }

const { abi, connect } = ICreateSpace__factory

export class ICreateSpaceShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
