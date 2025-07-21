import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { MockERC721A__factory } from '@towns-protocol/generated/dev/typings/factories/MockERC721A__factory'

const { abi, connect } = MockERC721A__factory

export class MockERC721AShim extends BaseContractShim<typeof connect> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, connect, abi)
    }
}
