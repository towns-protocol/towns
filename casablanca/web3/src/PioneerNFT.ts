import { ethers, BigNumber } from 'ethers'
import { IStaticContractsInfo, getContractsInfo } from './IStaticContractsInfo'

import { PioneerNFTShim } from './v3/PioneerNFTShim'
import { OwnableFacetShim } from './v3/OwnableFacetShim'

export interface PioneerNFTContractState {
    contractBalance: BigNumber
    mintReward: BigNumber
    contractAddress: string
    owner: string
}

export class PioneerNFT {
    private readonly contractsInfo: IStaticContractsInfo
    private readonly provider: ethers.providers.Provider | undefined
    public readonly pioneerNFTShim: PioneerNFTShim
    public readonly ownable: OwnableFacetShim

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        this.provider = provider
        this.contractsInfo = getContractsInfo(chainId)
        this.pioneerNFTShim = new PioneerNFTShim(
            this.contractsInfo.pioneerTokenAddress,
            chainId,
            provider,
        )
        this.ownable = new OwnableFacetShim(
            this.contractsInfo.pioneerTokenAddress,
            chainId,
            provider,
        )
    }

    public deposit(amount: BigNumber, signer: ethers.Signer | undefined) {
        if (!signer) {
            throw new Error('No signer')
        }

        return signer.sendTransaction({
            to: this.pioneerNFTShim.address,
            value: amount,
        })
    }

    public async withdraw(signer: ethers.Signer | undefined) {
        if (!signer) {
            throw new Error('No signer')
        }
        const address = await signer.getAddress()
        return this.pioneerNFTShim.write(signer).withdraw(address)
    }

    // given a wallet address, check if they have a Pioneer NFT
    public async isHolder(wallet: string) {
        if (!this.provider) {
            throw new Error('No provider')
        }
        const balance = await this.pioneerNFTShim.read.balanceOf(wallet)
        return balance.gt(0)
    }

    public async getContractState(): Promise<PioneerNFTContractState> {
        if (!this.provider) {
            throw new Error('No provider')
        }

        const contractBalance = await this.provider.getBalance(this.pioneerNFTShim.address)

        const mintReward = await this.pioneerNFTShim.read.getMintReward()

        const owner = await this.ownable.read.owner()

        return {
            contractBalance,
            mintReward,
            contractAddress: this.pioneerNFTShim.address,
            owner,
        }
    }
}
