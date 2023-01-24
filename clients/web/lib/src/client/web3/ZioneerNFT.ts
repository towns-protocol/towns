import { ethers, BigNumber } from 'ethers'
import { IStaticContractsInfo, getContractsInfo } from './IStaticContractsInfo'

import { ZioneerNFTShim } from './shims/ZioneerNFTShim'

export class ZioneerNFT {
    private readonly contractsInfo: IStaticContractsInfo
    private readonly provider: ethers.providers.Provider | undefined
    private readonly signer: ethers.Signer | undefined
    public readonly zioneerNFTShim: ZioneerNFTShim

    constructor(
        chainId: number,
        provider: ethers.providers.Provider | undefined,
        signer: ethers.Signer | undefined,
    ) {
        this.provider = provider
        this.signer = signer
        this.contractsInfo = getContractsInfo(chainId)
        this.zioneerNFTShim = new ZioneerNFTShim(
            this.contractsInfo.zioneerNft.address.zioneer,
            this.contractsInfo.zioneerNft.abi,
            chainId,
            provider,
            signer,
        )
    }

    public deposit(amount: BigNumber) {
        if (!this?.signer) {
            throw new Error('No signer')
        }

        return this.signer.sendTransaction({
            to: this.zioneerNFTShim.address,
            value: amount,
        })
    }

    public async withdraw() {
        if (!this?.signer) {
            throw new Error('No signer')
        }
        const address = await this.signer.getAddress()
        return this.zioneerNFTShim.write.withdraw(address)
    }

    public async getContractState() {
        if (!this.provider) {
            throw new Error('No provider')
        }
        const allowedLength = await this.zioneerNFTShim.read.allowedAddressesListLength()
        const allowedAddressesList: string[] = []
        for (let i = 0; allowedLength.gt(i); i++) {
            const address = await this.zioneerNFTShim.read.allowedAddressesList(i)
            allowedAddressesList.push(address)
        }

        const contractBalance = await this.provider.getBalance(this.zioneerNFTShim.address)

        const mintReward = await this.zioneerNFTShim.read.mintReward()

        const owner = await this.zioneerNFTShim.read.owner()

        return {
            allowedAddressesList,
            contractBalance,
            mintReward,
            contractAddress: this.zioneerNFTShim.address,
            owner,
        }
    }
}

type ZioneerNFTContractStatePromise = ReturnType<ZioneerNFT['getContractState']>

export type ZioneerNFTContractState = ZioneerNFTContractStatePromise extends Promise<infer U>
    ? U
    : ZioneerNFTContractStatePromise
