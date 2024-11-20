import { IDropFacetShim } from './IDropFacetShim'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { ethers } from 'ethers'

export class Drop {
    public readonly dropFacet: IDropFacetShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        if (!config.addresses.riverAirdrop) {
            throw new Error('River airdrop address is not set')
        }
        this.dropFacet = new IDropFacetShim(config.addresses.riverAirdrop, provider)
    }

    public get DropFacet(): IDropFacetShim {
        return this.dropFacet
    }
}
