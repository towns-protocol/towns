import { ISwapRouter__factory } from '@towns-protocol/generated/dev/typings/factories/ISwapRouter__factory'
import { BaseContractShim } from '../BaseContractShim'
import { ethers } from 'ethers'

const { abi, connect } = ISwapRouter__factory

export class ISwapRouterShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
