import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { ITreasury__factory } from '@towns-protocol/generated/dev/typings/factories/ITreasury__factory'

export class ITreasuryShim extends BaseContractShim<
    ContractType<typeof ITreasury__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, ITreasury__factory.connect.bind(ITreasury__factory))
    }
}
