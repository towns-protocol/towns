import { ContractTransaction, ethers } from 'ethers'

export class WalletLink {
    public async linkWallet(
        rootKey: ethers.Wallet,
        wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = await wallet.getAddress()
        const isLinkedAlready = await this.checkIfLinked(rootKeyAddress, await wallet.getAddress())
        if (isLinkedAlready) {
            throw new Error('Wallet is already linked')
        }

        const nonce = (await this.getLatestNonceForRootKey(rootKeyAddress)) + 1
        const rootKeySignature = await rootKey.signMessage(
            packAddressWithNonce(walletAddress, nonce),
        )

        return await this.linkWalletToRootKey(rootKeyAddress, rootKeySignature, wallet)
    }

    private linkWalletToRootKey(
        _rootKeyAddress: string,
        /* proof of rootKey authorization */
        _rootKeySignature: string,
        /* signed by the wallet */
        _wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }
    public async removeLinkViaRootKey(
        _walletAddress: string,
        /* signed by rootKey */
        _rootKey: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }
    public async removeLinkViaWallet(
        _rootKeyAddress: string,
        /* signed by wallet */
        _wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        throw new Error('Method not implemented.')
    }
    public async getWalletsByRootKey(_rootKeyAddress: string): Promise<string[]> {
        throw new Error('Method not implemented.')
    }
    public async checkIfLinked(_walletAddress: string, _rootKeyAddress: string): Promise<boolean> {
        throw new Error('Method not implemented.')
    }
    public async getLatestNonceForRootKey(_rootKeyAddress: string): Promise<number> {
        throw new Error('Method not implemented.')
    }
}

function packAddressWithNonce(address: string, nonce: number): string {
    const abi = ethers.utils.defaultAbiCoder
    const packed = abi.encode(['address', 'uint256'], [address, nonce])
    const hash = ethers.utils.keccak256(packed)
    return hash
}
