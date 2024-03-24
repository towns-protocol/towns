import { SpaceDapp, MockERC721AShim, getContractsInfo, DappConfig } from '../src'

export class TestSpaceDapp extends SpaceDapp {
    mockNFT: MockERC721AShim | undefined

    constructor(config: DappConfig) {
        super(config)

        const mockNFTAddress = getContractsInfo(config.chainId).mockErc721aAddress
        this.mockNFT = new MockERC721AShim(mockNFTAddress, config.chainId, config.provider)
    }
}
