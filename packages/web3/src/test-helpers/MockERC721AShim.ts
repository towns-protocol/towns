import { ethers } from 'ethers'
import { BaseContractShim } from '../BaseContractShim'
import { ContractType } from '../types/typechain'
import { MockERC721A__factory } from '@towns-protocol/generated/dev/typings/factories/MockERC721A__factory'

export class MockERC721AShim extends BaseContractShim<
    ContractType<typeof MockERC721A__factory.connect>
> {
    constructor(address: string, provider: ethers.providers.Provider) {
        super(address, provider, MockERC721A__factory.connect.bind(MockERC721A__factory))
    }
}
