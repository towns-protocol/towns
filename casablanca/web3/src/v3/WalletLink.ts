import { BigNumber, ContractTransaction, ethers } from 'ethers'
import { IWalletLinkShim } from './WalletLinkShim'
import { IStaticContractsInfo } from '../IStaticContractsInfo'

export class WalletLink {
    private readonly walletLinkShim: IWalletLinkShim

    constructor(
        contractInfo: IStaticContractsInfo,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.walletLinkShim = new IWalletLinkShim(contractInfo.walletLinkAddress, chainId, provider)
    }

    public async linkWallet(
        rootKey: ethers.Wallet,
        wallet: ethers.Signer,
    ): Promise<ContractTransaction> {
        const rootKeyAddress = await rootKey.getAddress()
        const walletAddress = await wallet.getAddress()
        const isLinkedAlready = await this.walletLinkShim.read.checkIfLinked(
            rootKeyAddress,
            await wallet.getAddress(),
        )
        if (isLinkedAlready) {
            throw new Error('Wallet is already linked')
        }

        const currentNonce = await this.walletLinkShim.read.getLatestNonceForRootKey(rootKeyAddress)
        const nonce = currentNonce.add(1)
        const rootKeySignature = await rootKey.signMessage(
            packAddressWithNonce(walletAddress, nonce),
        )

        return (
            this.walletLinkShim
                .write(wallet)
                // TODO-HNT-3102 - change  once wallet link contract is on Base
                .linkWalletToRootKey(walletAddress, [], rootKeyAddress, rootKeySignature, nonce)
        )
    }
}

function packAddressWithNonce(address: string, nonce: BigNumber): string {
    const abi = ethers.utils.defaultAbiCoder
    const packed = abi.encode(['address', 'uint256'], [address, nonce.toNumber()])
    const hash = ethers.utils.keccak256(packed)
    return hash
}
