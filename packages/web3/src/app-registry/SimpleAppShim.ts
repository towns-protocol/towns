import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { SimpleApp__factory } from '@towns-protocol/generated/dev/typings/factories/SimpleApp__factory'

const { abi, connect } = SimpleApp__factory

export class SimpleAppShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
