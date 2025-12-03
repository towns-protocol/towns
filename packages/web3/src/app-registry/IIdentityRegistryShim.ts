import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IIdentityRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/IIdentityRegistry__factory'

const { abi, connect } = IIdentityRegistry__factory

export class IIdentityRegistryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
