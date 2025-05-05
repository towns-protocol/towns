import { IMulticall__factory } from '@towns-protocol/generated/dev/typings/factories/IMulticall__factory'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

const { abi, connect } = IMulticall__factory

export class IMulticallShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
