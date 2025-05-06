import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { TokenPausableFacet__factory } from '@towns-protocol/generated/dev/typings/factories/TokenPausableFacet__factory'

const { abi, connect } = TokenPausableFacet__factory

export class TokenPausableFacetShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
