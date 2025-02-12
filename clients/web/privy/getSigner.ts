import { ConnectedWallet } from '@privy-io/react-auth'

export async function getSigner(embeddedWallet: ConnectedWallet | undefined, chainId: number) {
    if (!embeddedWallet) {
        return undefined
    }

    await embeddedWallet.switchChain(chainId)
    const provider = await embeddedWallet.getEthersProvider()
    const signer = provider?.getSigner()

    if (!signer) {
        throw new Error('[WalletReady]: Failed to get signer')
    }

    return signer
}
