import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IReputationRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/IReputationRegistry__factory'

const { abi, connect } = IReputationRegistry__factory

export class IReputationRegistryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
