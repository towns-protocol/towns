import { BigNumber, ContractTransaction, ethers } from 'ethers'
import { IWalletLinkShim } from './WalletLinkShim'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { arrayify } from 'ethers/lib/utils'
import { WalletAlreadyLinkedError, WalletNotLinkedError } from '../error-types'
import { Address } from '../ContractTypes'

export class WalletLink {
    private readonly walletLinkShim: IWalletLinkShim
    public address: Address

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider | undefined) {
        this.walletLinkShim = new IWalletLinkShim(
            config.addresses.spaceFactory,
            config.contractVersion,
            provider,
        )
        this.address = config.addresses.spaceFactory
    }

    private async assertNotAlreadyLinked(rootKey: ethers.Signer, wallet: ethers.Signer | Address) {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = typeof wallet === 'string' ? wallet : await wallet.getAddress()
        const isLinkedAlready = await this.walletLinkShim.read.checkIfLinked(
            rootKeyAddress,
            walletAddress,
        )

        if (isLinkedAlready) {
            throw new WalletAlreadyLinkedError()
        }

        return { rootKeyAddress, walletAddress }
    }

    private async assertAlreadyLinked(rootKey: ethers.Signer, walletAddress: string) {
        const rootKeyAddress = await rootKey.getAddress()
        const isLinkedAlready = await this.walletLinkShim.read.checkIfLinked(
            rootKeyAddress,
            walletAddress,
        )
        if (!isLinkedAlready) {
            throw new WalletNotLinkedError()
        }
        return { rootKeyAddress, walletAddress }
    }

    private generateRootKeySignatureForWallet({
        rootKey,
        walletAddress,
        rootKeyNonce,
    }: {
        rootKey: ethers.Signer
        walletAddress: string
        rootKeyNonce: BigNumber
    }) {
        return rootKey.signMessage(packAddressWithNonce(walletAddress, rootKeyNonce))
    }

    private generateWalletSignatureForRootKey({
        wallet,
        rootKeyAddress,
        rootKeyNonce,
    }: {
        wallet: ethers.Signer
        rootKeyAddress: string
        rootKeyNonce: BigNumber
    }) {
        return wallet.signMessage(packAddressWithNonce(rootKeyAddress, rootKeyNonce))
    }

    private async generateLinkCallerData(rootKey: ethers.Signer, wallet: ethers.Signer | Address) {
        const { rootKeyAddress, walletAddress } = await this.assertNotAlreadyLinked(rootKey, wallet)

        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const rootKeySignature = await rootKey.signMessage(
            packAddressWithNonce(walletAddress, nonce),
        )

        const rootKeyData = {
            addr: rootKeyAddress,
            signature: rootKeySignature,
        }

        return { rootKeyData, nonce }
    }

    private async generateLinkWalletData(rootKey: ethers.Signer, wallet: ethers.Signer) {
        const { rootKeyAddress, walletAddress } = await this.assertNotAlreadyLinked(rootKey, wallet)

        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)

        // sign root key with new wallet address
        const rootKeySignature = await this.generateRootKeySignatureForWallet({
            rootKey,
            walletAddress,
            rootKeyNonce: nonce,
        })

        // sign new wallet with root key address
        const walletSignature = await this.generateWalletSignatureForRootKey({
            wallet,
            rootKeyAddress,
            rootKeyNonce: nonce,
        })

        const rootKeyData = {
            addr: rootKeyAddress,
            signature: rootKeySignature,
        }

        const walletData = {
            addr: walletAddress,
            signature: walletSignature,
        }

        return { rootKeyData, walletData, nonce }
    }

    /**
     * Link a wallet to the root key with the wallet as the caller
     * @param rootKey
     * @param wallet
     */
    public async linkCallerToRootKey(
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        const { rootKeyData, nonce } = await this.generateLinkCallerData(rootKey, wallet)

        // msg.sender = new wallet
        return this.walletLinkShim.write(wallet).linkCallerToRootKey(rootKeyData, nonce)
    }

    /**
     * Link a wallet to the root key with the root key as the caller
     *
     * @param wallet
     * @param rootKey
     * @returns
     */
    public async linkWalletToRootKey(rootKey: ethers.Signer, wallet: ethers.Signer) {
        const { walletData, rootKeyData, nonce } = await this.generateLinkWalletData(
            rootKey,
            wallet,
        )

        // msg.sender = root key
        return this.walletLinkShim
            .write(rootKey)
            .linkWalletToRootKey(walletData, rootKeyData, nonce)
    }

    public async encodeLinkCallerToRootKey(
        rootKey: ethers.Signer,
        wallet: Address,
    ): Promise<string> {
        const { rootKeyData, nonce } = await this.generateLinkCallerData(rootKey, wallet)

        return this.walletLinkShim.interface.encodeFunctionData('linkCallerToRootKey', [
            rootKeyData,
            nonce,
        ])
    }

    public async encodeLinkWalletToRootKey(
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ): Promise<string> {
        const { walletData, rootKeyData, nonce } = await this.generateLinkWalletData(
            rootKey,
            wallet,
        )

        return this.walletLinkShim.interface.encodeFunctionData('linkWalletToRootKey', [
            walletData,
            rootKeyData,
            nonce,
        ])
    }

    public parseError(error: any): Error {
        return this.walletLinkShim.parseError(error)
    }

    public async getLinkedWallets(rootKey: string): Promise<string[]> {
        return this.walletLinkShim.read.getWalletsByRootKey(rootKey)
    }

    public getRootKeyForWallet(wallet: string): Promise<string> {
        return this.walletLinkShim.read.getRootKeyForWallet(wallet)
    }

    public async checkIfLinked(rootKey: ethers.Signer, wallet: string): Promise<boolean> {
        const rootKeyAddress = await rootKey.getAddress()
        return this.walletLinkShim.read.checkIfLinked(rootKeyAddress, wallet)
    }

    private async generateRemoveLinkData(rootKey: ethers.Signer, walletAddress: string) {
        const { rootKeyAddress } = await this.assertAlreadyLinked(rootKey, walletAddress)
        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const rootKeySignature = await rootKey.signMessage(
            packAddressWithNonce(walletAddress, nonce),
        )

        return { rootKeyAddress, rootKeySignature, nonce }
    }

    public async removeLink(
        rootKey: ethers.Signer,
        walletAddress: string,
    ): Promise<ContractTransaction> {
        const { rootKeyAddress, rootKeySignature, nonce } = await this.generateRemoveLinkData(
            rootKey,
            walletAddress,
        )

        return await this.walletLinkShim.write(rootKey).removeLink(
            walletAddress,
            {
                addr: rootKeyAddress,
                signature: rootKeySignature,
            },
            nonce,
        )
    }

    public async encodeRemoveLink(rootKey: ethers.Signer, walletAddress: string) {
        const { rootKeyAddress, rootKeySignature, nonce } = await this.generateRemoveLinkData(
            rootKey,
            walletAddress,
        )

        return this.walletLinkShim.interface.encodeFunctionData('removeLink', [
            walletAddress,
            {
                addr: rootKeyAddress,
                signature: rootKeySignature,
            },
            nonce,
        ])
    }

    public getInterface() {
        return this.walletLinkShim.interface
    }
}

function packAddressWithNonce(address: string, nonce: BigNumber): Uint8Array {
    const abi = ethers.utils.defaultAbiCoder
    const packed = abi.encode(['address', 'uint256'], [address, nonce.toNumber()])
    const hash = ethers.utils.keccak256(packed)
    return arrayify(hash)
}
