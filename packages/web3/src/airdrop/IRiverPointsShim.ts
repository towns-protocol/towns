import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ITownsPoints__factory } from '@towns-protocol/generated/dev/typings/factories/ITownsPoints__factory'

const { abi, connect } = ITownsPoints__factory

export class IRiverPointsShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
