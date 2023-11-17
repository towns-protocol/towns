import { ethers, BigNumber, ContractTransaction } from 'ethers'
import { IStaticContractsInfo, getContractsInfo } from './IStaticContractsInfo'

import { PioneerNFTShim as PioneerNFTShimV3 } from './v3/PioneerNFTShim'
import { OwnableFacetShim as OwnableFacetShimV3 } from './v3/OwnableFacetShim'

import { PioneerNFTShim as PioneerNFTShimV4 } from './v4/PioneerNFTShim'
import { OwnableFacetShim as OwnableFacetShimV4 } from './v4/OwnableFacetShim'
import { Address, PublicClient, WalletClient } from 'viem'
import { isEthersProvider, isPublicClient } from './Utils'
import { SpaceDappTransaction } from './v4'

type Versions = 'ethers' | 'viem'

type ProviderType<V extends Versions = 'ethers'> = V extends 'ethers'
    ? ethers.providers.Provider
    : PublicClient

export type PioneerNFTContractState<V extends Versions = 'ethers'> = V extends 'ethers'
    ? {
          contractBalance: BigNumber
          mintReward: BigNumber
          contractAddress: string
          owner: string
      }
    : {
          contractBalance: bigint
          mintReward: bigint
          contractAddress: Address
          owner: Address
      }

type IfEthersElse<EType, VType, V extends Versions = 'ethers'> = V extends 'ethers' ? EType : VType

export interface IPioneerNft<V extends Versions = 'ethers'> {
    contractsInfo: IStaticContractsInfo
    provider: IfEthersElse<ethers.providers.Provider, PublicClient, V> | undefined
    pioneerNFTShim: IfEthersElse<PioneerNFTShimV3, PioneerNFTShimV4, V>
    ownable: IfEthersElse<OwnableFacetShimV3, OwnableFacetShimV4, V>
    deposit: (
        amount: IfEthersElse<BigNumber, bigint, V>,
        signer: IfEthersElse<ethers.Signer, WalletClient, V> | undefined,
    ) => Promise<IfEthersElse<ethers.providers.TransactionResponse, Address, V>>
    withdraw: (
        signer: IfEthersElse<ethers.Signer, WalletClient, V> | undefined,
    ) => IfEthersElse<Promise<ContractTransaction>, Promise<SpaceDappTransaction>, V>
    isHolder: (wallet: IfEthersElse<string, Address, V>) => Promise<boolean>
    getContractState: () => Promise<
        IfEthersElse<PioneerNFTContractState<'ethers'>, PioneerNFTContractState<'viem'>, V>
    >
}
class PioneerNFTEthers implements IPioneerNft<'ethers'> {
    public readonly contractsInfo: IStaticContractsInfo
    public readonly provider: ethers.providers.Provider | undefined
    public readonly pioneerNFTShim: PioneerNFTShimV3
    public readonly ownable: OwnableFacetShimV3

    constructor(chainId: number, provider: ethers.providers.Provider | undefined) {
        this.provider = provider
        this.contractsInfo = getContractsInfo(chainId)
        this.pioneerNFTShim = new PioneerNFTShimV3(
            this.contractsInfo.pioneerTokenAddress,
            chainId,
            provider,
        )
        this.ownable = new OwnableFacetShimV3(
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

class PioneerNFTViem implements IPioneerNft<'viem'> {
    public readonly contractsInfo: IStaticContractsInfo
    public readonly provider: PublicClient | undefined
    public readonly pioneerNFTShim: PioneerNFTShimV4
    public readonly ownable: OwnableFacetShimV4

    constructor(chainId: number, provider: PublicClient | undefined) {
        this.provider = provider
        this.contractsInfo = getContractsInfo(chainId)
        this.pioneerNFTShim = new PioneerNFTShimV4(
            this.contractsInfo.pioneerTokenAddress,
            chainId,
            provider,
        )
        this.ownable = new OwnableFacetShimV4(
            this.contractsInfo.pioneerTokenAddress,
            chainId,
            provider,
        )
    }

    public deposit(amount: bigint, signer: WalletClient | undefined) {
        if (!signer) {
            throw new Error('No signer')
        }
        if (!signer.account) {
            throw new Error('No signer account')
        }

        return signer.sendTransaction({
            account: signer.account,
            to: this.pioneerNFTShim.address,
            value: amount,
            chain: signer.chain,
        })
    }

    public async withdraw(signer: WalletClient | undefined) {
        if (!signer) {
            throw new Error('No signer')
        }
        const address = signer.account?.address
        if (!address) {
            throw new Error('No signer account address')
        }
        return this.pioneerNFTShim.write({
            functionName: 'withdraw',
            args: [address],
            wallet: signer,
        })
    }

    // given a wallet address, check if they have a Pioneer NFT
    public async isHolder(wallet: Address) {
        if (!this.provider) {
            throw new Error('No provider')
        }
        const balance = await this.pioneerNFTShim.read({
            functionName: 'balanceOf',
            args: [wallet],
        })
        return Number(balance) > 0
    }

    public async getContractState(): Promise<PioneerNFTContractState<'viem'>> {
        if (!this.provider) {
            throw new Error('No provider')
        }

        const contractBalance = await this.provider.getBalance({
            address: this.pioneerNFTShim.address,
        })

        const mintReward = await this.pioneerNFTShim.read({
            functionName: 'mintReward',
        })

        const owner = await this.ownable.read({
            functionName: 'owner',
        })

        return {
            contractBalance,
            mintReward,
            contractAddress: this.pioneerNFTShim.address,
            owner,
        }
    }
}

export function pioneerNftFactory<V extends Versions = 'ethers'>(
    chainId: number,
    provider: ProviderType<V> | undefined,
    version: Versions = 'ethers',
): IPioneerNft<typeof version> {
    if (provider === undefined) {
        throw new Error('pioneerNftFactory() Provider is undefined')
    }
    switch (version) {
        case 'ethers': {
            if (isEthersProvider(provider)) {
                return new PioneerNFTEthers(chainId, provider) as IPioneerNft<'ethers'>
            }
            throw new Error("pioneerNftFactory() 'ethers' Provider is not an ethers provider")
        }
        case 'viem': {
            if (isPublicClient(provider)) {
                return new PioneerNFTViem(chainId, provider) as IPioneerNft<'viem'>
            }
            throw new Error("pioneerNftFactory() 'viem' Provider is not an ethers provider")
        }
        default:
            throw new Error('pioneerNftFactory() not a valid version')
    }
}
