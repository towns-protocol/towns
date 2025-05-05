import { StreamRegistry__factory } from '@towns-protocol/generated/dev/typings/factories/StreamRegistry__factory'
import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'

const { abi, connect } = StreamRegistry__factory

export class IStreamRegistryShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
