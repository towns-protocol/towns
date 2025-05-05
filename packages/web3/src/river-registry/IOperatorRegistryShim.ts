import { OperatorRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/OperatorRegistry__factory'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

const { abi, connect } = OperatorRegistry__factory

export class IOperatorRegistryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
