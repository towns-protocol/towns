import { ethers, BigNumber } from 'ethers'
import { IStaticContractsInfo, getContractsInfo } from './IStaticContractsInfo'

import { MemberNFTShim } from './shims/MemberNFTShim'

export interface MemberNFTContractState {
    contractBalance: BigNumber
    mintReward: BigNumber
    contractAddress: string
    owner: string
}

export class MemberNFT {
    private readonly contractsInfo: IStaticContractsInfo
    public readonly memberNFTShim: MemberNFTShim
    private readonly signer: ethers.Signer

    constructor(chainId: number, provider: ethers.providers.Provider, signer: ethers.Signer) {
        this.signer = signer
        this.contractsInfo = getContractsInfo(chainId)
        this.memberNFTShim = new MemberNFTShim(
            this.contractsInfo.memberNft.address,
            this.contractsInfo.memberNft.abi,
            chainId,
            provider,
        )
    }

    public async publicMint(address: string) {
        try {
            const mintPrice = await this.memberNFTShim.read.MINT_PRICE()
            const receipt = await this.memberNFTShim
                .write(this.signer)
                .publicMint(address, { value: mintPrice })
            await receipt.wait()
        } catch (e) {
            console.error('publicMint failed', e)
        }
    }
}
