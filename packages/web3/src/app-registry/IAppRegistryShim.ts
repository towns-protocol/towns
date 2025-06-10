import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IAppRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/IAppRegistry__factory'

const { abi, connect } = IAppRegistry__factory

export class IAppRegistryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
