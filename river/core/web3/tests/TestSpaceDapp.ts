import { ethers } from 'ethers'
import { SpaceDapp, MockERC721AShim, BaseChainConfig } from '../src'

export class TestSpaceDapp extends SpaceDapp {
    mockNFT: MockERC721AShim | undefined

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        super(config, provider)

        const mockNFTAddress = config.addresses.mockNFT
        this.mockNFT = mockNFTAddress
            ? new MockERC721AShim(mockNFTAddress, config.contractVersion, provider)
            : undefined
    }
}
