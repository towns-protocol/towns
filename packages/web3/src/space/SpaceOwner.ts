import { ethers } from 'ethers'
import { BaseChainConfig } from 'utils'
import { IERC721AShim } from 'erc-721/IERC721AShim'
import { ISpaceOwnerShim } from 'space/ISpaceOwnerShim'

export class SpaceOwner {
    public readonly config: BaseChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly spaceOwner: ISpaceOwnerShim
    public readonly erc721A: IERC721AShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.config = config
        this.provider = provider
        this.spaceOwner = new ISpaceOwnerShim(this.config.addresses.spaceOwner, provider)
        this.erc721A = new IERC721AShim(this.config.addresses.spaceOwner, provider)
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.erc721A.read.totalSupply()
    }
}
