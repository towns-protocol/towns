import { BigNumber, ContractTransaction, ethers } from 'ethers'
import { IWalletLinkShim } from './WalletLinkShim'
import { IStaticContractsInfo } from '../IStaticContractsInfo'
import { arrayify } from 'ethers/lib/utils'
import { WalletAlreadyLinkedError, WalletNotLinkedError } from '../error-types'
import { Address } from '../ContractTypes'

export class WalletLink {
    private readonly walletLinkShim: IWalletLinkShim
    public address: Address

    constructor(
        contractInfo: IStaticContractsInfo,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.walletLinkShim = new IWalletLinkShim(contractInfo.walletLinkAddress, chainId, provider)
        this.address = contractInfo.walletLinkAddress
    }

    public async linkWallet(
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = await wallet.getAddress()
        const isLinkedAlready = await this.walletLinkShim.read.checkIfLinked(
            rootKeyAddress,
            walletAddress,
        )

        if (isLinkedAlready) {
            throw new WalletAlreadyLinkedError()
        }

        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const rootKeySignature = await rootKey.signMessage(
            packAddressWithNonce(walletAddress, nonce),
        )

        return this.walletLinkShim
            .write(wallet)
            .linkWalletToRootKey(rootKeyAddress, rootKeySignature, nonce)
    }

    public async encodeLinkWalletFunctionData(
        rootKey: ethers.Signer,
        wallet: Address,
    ): Promise<string> {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = wallet
        const isLinkedAlready = await this.walletLinkShim.read.checkIfLinked(
            rootKeyAddress,
            walletAddress,
        )
        if (isLinkedAlready) {
            throw new WalletAlreadyLinkedError()
        }
        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const rootKeySignature = await rootKey.signMessage(
            packAddressWithNonce(walletAddress, nonce),
        )

        return this.walletLinkShim.interface.encodeFunctionData('linkWalletToRootKey', [
            rootKeyAddress,
            rootKeySignature,
            nonce,
        ])
    }

    public parseError(error: any): Error {
        return this.walletLinkShim.parseError(error)
    }

    public async getLinkedWallets(rootKey: string): Promise<string[]> {
        return this.walletLinkShim.read.getWalletsByRootKey(rootKey)
    }

    public async checkIfLinked(rootKey: ethers.Signer, wallet: string): Promise<boolean> {
        const rootKeyAddress = await rootKey.getAddress()
        return this.walletLinkShim.read.checkIfLinked(rootKeyAddress, wallet)
    }

    public async removeLink(
        rootKey: ethers.Signer,
        walletAddress: string,
    ): Promise<ContractTransaction> {
        const rootKeyAddress = await rootKey.getAddress()
        const isLinkedAlready = await this.walletLinkShim.read.checkIfLinked(
            rootKeyAddress,
            walletAddress,
        )
        if (!isLinkedAlready) {
            throw new WalletNotLinkedError()
        }

        return await this.walletLinkShim.write(rootKey).removeLink(walletAddress)
    }
}

function packAddressWithNonce(address: string, nonce: BigNumber): Uint8Array {
    const abi = ethers.utils.defaultAbiCoder
    const packed = abi.encode(['address', 'uint256'], [address, nonce.toNumber()])
    const hash = ethers.utils.keccak256(packed)
    return arrayify(hash)
}
