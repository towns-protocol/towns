import {
    IMembershipBase as LocalhostIMembershipBase,
    ICreateSpace as LocalhostContract,
    IArchitectBase as LocalhostISpaceArchitectBase,
    ICreateSpaceInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/ICreateSpace'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/ICreateSpace.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostIMembershipBase as IMembershipBase }
export type { LocalhostISpaceArchitectBase as IArchitectBase }

export class ICreateSpaceShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
