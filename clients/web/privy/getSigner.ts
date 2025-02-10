import { ConnectedWallet } from '@privy-io/react-auth'
import { providers } from 'ethers'

export async function getSigner(embeddedWallet: ConnectedWallet | undefined, chainId: number) {
    if (!embeddedWallet) {
        return undefined
    }

    await embeddedWallet.switchChain(chainId)
    const privyProvider = await embeddedWallet.getEthereumProvider()
    const provider = new providers.Web3Provider(privyProvider)
    const signer = provider?.getSigner()

    if (!signer) {
        throw new Error('[WalletReady]: Failed to get signer')
    }

    return signer
}
