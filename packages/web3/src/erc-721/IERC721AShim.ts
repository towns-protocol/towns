import { ethers } from 'ethers'
import { IERC721A__factory } from '@towns-protocol/generated/dev/typings/factories/IERC721A__factory'
import { BaseContractShim } from '../BaseContractShim'

const { abi, connect } = IERC721A__factory

export class IERC721AShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
