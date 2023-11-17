import { IWalletLinkShim } from './WalletLinkShim'
import { IStaticContractsInfo } from '../IStaticContractsInfo'
import {
    Address,
    PublicClient,
    WalletClient,
    encodeAbiParameters,
    keccak256,
    parseAbiParameters,
    toBytes,
} from 'viem'
import { SpaceDappTransaction } from './types'

export class WalletLink {
    private readonly walletLinkShim: IWalletLinkShim

    constructor(
        contractInfo: IStaticContractsInfo,
        chainId: number,
        provider: PublicClient | undefined,
    ) {
        this.walletLinkShim = new IWalletLinkShim(contractInfo.walletLinkAddress, chainId, provider)
    }

    public async linkWallet(
        rootKey: WalletClient,
        wallet: WalletClient,
    ): Promise<SpaceDappTransaction> {
        const rootKeyAddress = rootKey.account?.address
        const walletAddress = wallet.account?.address
        if (!rootKeyAddress || !walletAddress) {
            throw new Error('Root key or wallet is not connected')
        }
        const isLinkedAlready = await this.walletLinkShim.read({
            functionName: 'checkIfLinked',
            args: [rootKeyAddress, walletAddress],
        })

        if (isLinkedAlready) {
            throw new Error('Wallet is already linked')
        }

        const currentNonce = await this.walletLinkShim.read({
            functionName: 'getLatestNonceForRootKey',
            args: [rootKeyAddress],
        })
        const nonce = currentNonce + BigInt(1)
        const rootKeySignature = await rootKey.signMessage({
            account: rootKeyAddress,
            message: { raw: packAddressWithNonce(walletAddress, nonce) },
        })

        return this.walletLinkShim.write({
            functionName: 'linkWalletToRootKey',
            args: [rootKeyAddress, rootKeySignature, nonce],
            wallet,
        })
    }

    public parseError(error: any): Error {
        return this.walletLinkShim.parseError(error)
    }

    public async getLinkedWallets(rootKey: Address): Promise<readonly Address[]> {
        return this.walletLinkShim.read({
            functionName: 'getWalletsByRootKey',
            args: [rootKey],
        })
    }

    public async removeLink(
        rootKey: WalletClient,
        walletAddress: Address,
    ): Promise<SpaceDappTransaction> {
        const rootKeyAddress = rootKey.account?.address
        if (!rootKeyAddress) {
            throw new Error('No root key connected')
        }
        const isLinkedAlready = await this.walletLinkShim.read({
            functionName: 'checkIfLinked',
            args: [rootKeyAddress, walletAddress],
        })

        if (!isLinkedAlready) {
            throw new Error('Wallet is not linked')
        }

        return this.walletLinkShim.write({
            functionName: 'removeLink',
            args: [walletAddress],
            wallet: rootKey,
        })
    }
}

function packAddressWithNonce(address: Address, nonce: bigint): Uint8Array {
    const packed = encodeAbiParameters(parseAbiParameters(['address, uint64']), [address, nonce])
    const hash = keccak256(packed)
    return toBytes(hash)
}
