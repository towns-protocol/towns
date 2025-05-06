import { ethers } from 'ethers'

import { ISpaceOwnerBase } from '@towns-protocol/generated/dev/typings/SpaceOwner'
import { BaseContractShim } from '../BaseContractShim'
import { SpaceOwner__factory } from '@towns-protocol/generated/dev/typings/factories/SpaceOwner__factory'

export type { ISpaceOwnerBase }

const { abi, connect } = SpaceOwner__factory

export class SpaceOwner extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }
}
