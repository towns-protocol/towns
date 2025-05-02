import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { IWalletLink__factory } from '@towns-protocol/generated/dev/typings/factories/IWalletLink__factory'

export class IWalletLinkShim extends BaseContractShim<
    ContractType<typeof IWalletLink__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, IWalletLink__factory.connect.bind(IWalletLink__factory))
    }
}
