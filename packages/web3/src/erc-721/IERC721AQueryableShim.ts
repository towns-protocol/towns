import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { IERC721AQueryable__factory } from '@towns-protocol/generated/dev/typings/factories/IERC721AQueryable__factory'

const { abi, connect } = IERC721AQueryable__factory

export class IERC721AQueryableShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
