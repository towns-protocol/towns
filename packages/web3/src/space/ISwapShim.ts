import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ISwapFacet__factory } from '@towns-protocol/generated/dev/typings/factories/ISwapFacet__factory'

const { abi, connect } = ISwapFacet__factory

export class ISwapShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
