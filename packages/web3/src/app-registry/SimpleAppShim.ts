import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ISimpleApp__factory } from '@towns-protocol/generated/dev/typings/factories/ISimpleApp__factory'

const { abi, connect } = ISimpleApp__factory

export class SimpleAppShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
