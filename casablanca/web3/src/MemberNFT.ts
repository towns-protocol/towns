import { ethers, BigNumber } from 'ethers'
import { IStaticContractsInfoV3, getContractsInfoV3 } from './v3/IStaticContractsInfoV3'

import { MemberNFTShim } from './shims/MemberNFTShim'

export interface MemberNFTContractState {
    contractBalance: BigNumber
    mintReward: BigNumber
    contractAddress: string
    owner: string
}

export class MemberNFT {
    private readonly contractsInfo: IStaticContractsInfoV3
    public readonly memberNFTShim: MemberNFTShim
    private readonly signer: ethers.Signer

    constructor(chainId: number, provider: ethers.providers.Provider, signer: ethers.Signer) {
        this.signer = signer
        this.contractsInfo = getContractsInfoV3(chainId)
        this.memberNFTShim = new MemberNFTShim(
            this.contractsInfo.memberTokenAddress,
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
