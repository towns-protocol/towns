import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { DropFacet__factory } from '@towns-protocol/generated/dev/typings/factories/DropFacet__factory'

const { abi, connect } = DropFacet__factory

export class IDropFacetShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
