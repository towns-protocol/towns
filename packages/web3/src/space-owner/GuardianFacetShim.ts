import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { GuardianFacet__factory } from '@towns-protocol/generated/dev/typings/factories/GuardianFacet__factory'

const { abi, connect } = GuardianFacet__factory

export class GuardianFacetShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
