import { ethers } from 'ethers'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { IERC721AShim } from './IERC721AShim'
import { ISpaceOwnerShim } from './ISpaceOwnerShim'

export class SpaceOwner {
    public readonly config: BaseChainConfig
    public readonly provider: ethers.providers.Provider
    public readonly spaceOwner: ISpaceOwnerShim
    public readonly erc721A: IERC721AShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.config = config
        this.provider = provider
        this.spaceOwner = new ISpaceOwnerShim(
            this.config.addresses.spaceOwner,
            this.config.contractVersion,
            provider,
        )
        this.erc721A = new IERC721AShim(
            this.config.addresses.spaceOwner,
            this.config.contractVersion,
            provider,
        )
    }

    public async getNumTotalSpaces(): Promise<ethers.BigNumber> {
        return this.erc721A.read.totalSupply()
    }
}
