import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { NodeRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/NodeRegistry__factory'
import { ContractType } from '../types/typechain'

const { abi, connect } = NodeRegistry__factory

export class INodeRegistryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
