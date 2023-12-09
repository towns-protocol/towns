import { ethers, BigNumber } from 'ethers'
import { IStaticContractsInfo, getContractsInfo } from './IStaticContractsInfo'

import { TestGatingNFTShim } from './v3/TestGatingNFTShim'

export interface TestGatingNFTContractState {
    contractBalance: BigNumber
    mintReward: BigNumber
    contractAddress: string
    owner: string
}
// jterzis note 10/2023: Member.sol contract has been deprecated and so this class is no longer used
// in new network environments.
export class TestGatingNFT {
    private readonly contractsInfo: IStaticContractsInfo
    public readonly testGatingNFTShim: TestGatingNFTShim
    private readonly signer: ethers.Signer

    constructor(chainId: number, provider: ethers.providers.Provider, signer: ethers.Signer) {
        this.signer = signer
        this.contractsInfo = getContractsInfo(chainId)
        this.testGatingNFTShim = new TestGatingNFTShim(
            this.contractsInfo.testGatingTokenAddress ?? '',
            chainId,
            provider,
        )
    }

    public async publicMint(address: string) {
        try {
            const mintPrice = await this.testGatingNFTShim.read.MINT_PRICE()
            const receipt = await this.testGatingNFTShim
                .write(this.signer)
                .publicMint(address, { value: mintPrice })
            await receipt.wait()
        } catch (e) {
            console.error('publicMint failed', e)
        }
    }
}
