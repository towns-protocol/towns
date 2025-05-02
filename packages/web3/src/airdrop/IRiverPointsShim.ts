import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { ITownsPoints__factory } from '@towns-protocol/generated/dev/typings/factories/ITownsPoints__factory'

export class IRiverPointsShim extends BaseContractShim<
    ContractType<typeof ITownsPoints__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, ITownsPoints__factory.connect.bind(ITownsPoints__factory))
    }
}
