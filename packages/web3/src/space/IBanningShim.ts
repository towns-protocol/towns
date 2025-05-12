import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IBanning__factory } from '@towns-protocol/generated/dev/typings/factories/IBanning__factory'

const { abi, connect } = IBanning__factory

export class IBanningShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
