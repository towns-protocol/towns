import { IDropFacetShim } from './IDropFacetShim'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { BigNumber, ethers } from 'ethers'
import { IRiverPointsShim } from './IRiverPointsShim'
import { IERC721AShim } from './IERC721AShim'

export class RiverAirdropDapp {
    // river airdrop isn't on all chains, so the facets might be undefined
    public readonly drop?: IDropFacetShim
    public readonly riverPoints?: IRiverPointsShim
    public readonly erc721A?: IERC721AShim

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        if (config.addresses.riverAirdrop) {
            this.drop = new IDropFacetShim(config.addresses.riverAirdrop, provider)
            this.riverPoints = new IRiverPointsShim(config.addresses.riverAirdrop, provider)
            this.erc721A = new IERC721AShim(config.addresses.riverAirdrop, provider)
        }
    }

    public async getCurrentStreak(walletAddress: string): Promise<BigNumber> {
        return this.riverPoints?.read.getCurrentStreak(walletAddress) ?? BigNumber.from(0)
    }

    public async getLastCheckIn(walletAddress: string): Promise<BigNumber> {
        return this.riverPoints?.read.getLastCheckIn(walletAddress) ?? BigNumber.from(0)
    }

    public async checkIn(signer: ethers.Signer) {
        return this.riverPoints?.write(signer).checkIn()
    }

    public async balanceOf(walletAddress: string) {
        return this.erc721A?.read.balanceOf(walletAddress) ?? BigNumber.from(0)
    }
}
