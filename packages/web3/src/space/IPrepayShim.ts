import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { PrepayFacet__factory } from '@towns-protocol/generated/dev/typings/factories/PrepayFacet__factory'

const { abi, connect } = PrepayFacet__factory

export class IPrepayShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
