import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { OwnableFacet__factory } from '@towns-protocol/generated/dev/typings/factories/OwnableFacet__factory'

const { abi, connect } = OwnableFacet__factory

export class OwnableFacetShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
