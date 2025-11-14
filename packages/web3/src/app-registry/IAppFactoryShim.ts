import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IAppFactory__factory } from '@towns-protocol/generated/dev/typings/factories/IAppFactory__factory'

const { abi, connect } = IAppFactory__factory

export class IAppFactoryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
