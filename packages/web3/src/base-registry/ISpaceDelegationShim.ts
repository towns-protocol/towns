import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ISpaceDelegation__factory } from '@towns-protocol/generated/dev/typings/factories/ISpaceDelegation__factory'
import { ContractType } from '../types/typechain'

export class ISpaceDelegationShim extends BaseContractShim<
    ContractType<typeof ISpaceDelegation__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, ISpaceDelegation__factory.connect.bind(ISpaceDelegation__factory))
    }
}
