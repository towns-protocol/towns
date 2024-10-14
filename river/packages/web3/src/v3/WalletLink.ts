import { BigNumber, ContractTransaction, ethers } from 'ethers'
import { WalletAlreadyLinkedError, WalletNotLinkedError } from '../error-types'

import { Address } from '../ContractTypes'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { IWalletLinkShim } from './WalletLinkShim'
import { createEip712LinkedWalletdData } from './EIP-712'

export const INVALID_ADDRESS = '0x0000000000000000000000000000000000000000'

export class WalletLink {
    private readonly LINKED_WALLET_MESSAGE = 'Link your external wallet'
    private readonly walletLinkShim: IWalletLinkShim
    private readonly eip712Domain: ethers.TypedDataDomain
    public address: Address

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider | undefined) {
        this.walletLinkShim = new IWalletLinkShim(config.addresses.spaceFactory, provider)
        this.address = config.addresses.spaceFactory
        this.eip712Domain = {
            name: 'SpaceFactory',
            version: '1',
            chainId: config.chainId,
            verifyingContract: config.addresses.spaceFactory,
        }
    }

    public async isLinked(walletAddress: string): Promise<boolean> {
        const rootKeyAddress = await this.walletLinkShim.read.getRootKeyForWallet(walletAddress)

        return rootKeyAddress !== INVALID_ADDRESS
    }

    private async assertNotLinked(wallet: ethers.Signer | Address) {
        const walletAddress = typeof wallet === 'string' ? wallet : await wallet.getAddress()

        if (await this.isLinked(walletAddress)) {
            throw new WalletAlreadyLinkedError()
        }

        return { walletAddress }
    }

    private async assertLinked(walletAddress: string) {
        if (!(await this.isLinked(walletAddress))) {
            throw new WalletNotLinkedError()
        }
        return { walletAddress }
    }

    private generateRootKeySignatureForWallet({
        rootKey,
        walletAddress,
        rootKeyNonce,
    }: {
        rootKey: ethers.Signer
        walletAddress: Address
        rootKeyNonce: BigNumber
    }): Promise<string> {
        const { domain, types, value } = createEip712LinkedWalletdData({
            domain: this.eip712Domain,
            message: this.LINKED_WALLET_MESSAGE,
            nonce: rootKeyNonce,
            userID: walletAddress,
        })
        return this.signTypedData(rootKey, domain, types, value)
    }

    private generateWalletSignatureForRootKey({
        wallet,
        rootKeyAddress,
        nonce: rootKeyNonce,
    }: {
        wallet: ethers.Signer
        rootKeyAddress: Address
        nonce: BigNumber
    }): Promise<string> {
        const { domain, types, value } = createEip712LinkedWalletdData({
            domain: this.eip712Domain,
            message: this.LINKED_WALLET_MESSAGE,
            nonce: rootKeyNonce,
            userID: rootKeyAddress,
        })
        return this.signTypedData(wallet, domain, types, value)
    }

    private generateRootKeySignatureForCallerData({
        rootKey,
        walletAddress,
        rootKeyNonce,
    }: {
        rootKey: ethers.Signer
        walletAddress: Address
        rootKeyNonce: BigNumber
    }): Promise<string> {
        const { domain, types, value } = createEip712LinkedWalletdData({
            domain: this.eip712Domain,
            message: this.LINKED_WALLET_MESSAGE,
            nonce: rootKeyNonce,
            userID: walletAddress,
        })
        return this.signTypedData(rootKey, domain, types, value)
    }

    private async generateLinkCallerData(
        message: string,
        rootKey: ethers.Signer,
        wallet: ethers.Signer | Address,
    ) {
        const { walletAddress } = await this.assertNotLinked(wallet)
        const rootKeyAddress = await rootKey.getAddress()

        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const rootKeySignature = await this.generateRootKeySignatureForCallerData({
            rootKey,
            walletAddress: walletAddress as Address,
            rootKeyNonce: nonce,
        })

        const rootKeyData = {
            addr: rootKeyAddress,
            signature: rootKeySignature,
            message,
        }

        return { rootKeyData, nonce }
    }

    private async generateLinkWalletData(
        message: string,
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ) {
        const { walletAddress } = await this.assertNotLinked(wallet)
        const rootKeyAddress = await rootKey.getAddress()

        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)

        // sign root key with new wallet address
        const rootKeySignature = await this.generateRootKeySignatureForWallet({
            rootKey,
            walletAddress: walletAddress as Address,
            rootKeyNonce: nonce,
        })

        // sign new wallet with root key address
        const walletSignature = await this.generateWalletSignatureForRootKey({
            wallet,
            rootKeyAddress: rootKeyAddress as Address,
            nonce,
        })

        const rootKeyData = {
            addr: rootKeyAddress,
            signature: rootKeySignature,
            message,
        }

        const walletData = {
            addr: walletAddress,
            signature: walletSignature,
            message,
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
        const { rootKeyData, nonce } = await this.generateLinkCallerData(
            this.LINKED_WALLET_MESSAGE,
            rootKey,
            wallet,
        )

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
    public async linkWalletToRootKey(
        rootKey: ethers.Signer,
        wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        const { walletData, rootKeyData, nonce } = await this.generateLinkWalletData(
            this.LINKED_WALLET_MESSAGE,
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
        const { rootKeyData, nonce } = await this.generateLinkCallerData(
            this.LINKED_WALLET_MESSAGE,
            rootKey,
            wallet,
        )

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
            this.LINKED_WALLET_MESSAGE,
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
        await this.assertLinked(walletAddress)
        const rootKeyAddress = await rootKey.getAddress()
        const nonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const { domain, types, value } = createEip712LinkedWalletdData({
            domain: this.eip712Domain,
            message: this.LINKED_WALLET_MESSAGE,
            nonce,
            userID: walletAddress as Address,
        })
        const rootKeySignature = await this.signTypedData(rootKey, domain, types, value)
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
                message: this.LINKED_WALLET_MESSAGE,
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
                message: this.LINKED_WALLET_MESSAGE,
            },
            nonce,
        ])
    }

    private async signTypedData(
        signer: ethers.Signer,
        domain: any,
        types: any,
        value: any,
    ): Promise<string> {
        if ('_signTypedData' in signer && typeof signer._signTypedData === 'function') {
            return (await signer._signTypedData(domain, types, value)) as string
        } else {
            throw new Error('wallet does not have the funciton to sign typed data')
        }
    }

    public getInterface() {
        return this.walletLinkShim.interface
    }
}
