import { ethers } from 'ethers'

import { ISpaceOwnerBase } from '@towns-protocol/generated/dev/typings/SpaceOwner'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { SpaceOwner__factory } from '@towns-protocol/generated/dev/typings/factories/SpaceOwner__factory'

export type { ISpaceOwnerBase }

export class SpaceOwner extends BaseContractShim<ContractType<typeof SpaceOwner__factory.connect>> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, SpaceOwner__factory.connect.bind(SpaceOwner__factory))
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.read.totalSupply()
    }
}
