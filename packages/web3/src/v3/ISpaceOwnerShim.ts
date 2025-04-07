import {
    ISpaceOwner as LocalhostContract,
    ISpaceOwnerBase as LocalhostISpaceOwnerBase,
    ISpaceOwnerInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/ISpaceOwner'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/SpaceOwner.abi.json' assert { type: 'json' }

import { ethers } from 'ethers'
import { BaseContractShim } from './BaseContractShim'

export type { LocalhostISpaceOwnerBase as ISpaceOwnerBase }

export class ISpaceOwnerShim extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }
}
