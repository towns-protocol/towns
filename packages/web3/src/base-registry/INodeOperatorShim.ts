import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { INodeOperator__factory } from '@towns-protocol/generated/dev/typings/factories/INodeOperator__factory'

const { abi, connect } = INodeOperator__factory

export class INodeOperatorShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
