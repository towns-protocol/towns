import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ITreasury__factory } from '@towns-protocol/generated/dev/typings/factories/ITreasury__factory'

const { abi, connect } = ITreasury__factory
export class ITreasuryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
