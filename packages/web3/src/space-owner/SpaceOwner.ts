import { ethers } from 'ethers'

import {
    SpaceOwner as LocalhostContract,
    SpaceOwnerInterface as LocalhostInterface,
} from '@towns-protocol/generated/dev/typings/SpaceOwner'

import LocalhostAbi from '@towns-protocol/generated/dev/abis/SpaceOwner.abi.json' assert { type: 'json' }
import { BaseContractShim } from '../BaseContractShim'

export type { ISpaceOwnerBase } from '@towns-protocol/generated/dev/typings/SpaceOwner'

export class SpaceOwner extends BaseContractShim<LocalhostContract, LocalhostInterface> {
    constructor(address: string, provider: ethers.providers.Provider | undefined) {
        super(address, provider, LocalhostAbi)
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }
}
