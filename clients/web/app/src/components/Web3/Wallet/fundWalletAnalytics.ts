import { Analytics } from 'hooks/useAnalytics'
import { FundWalletCallbacks } from '../Decent/fund/types'

type Entrypoint = 'joinspace' | 'profile'

export function trackFundWalletTx(args: { success: boolean; entrypoint: Entrypoint }) {
    const { success, entrypoint } = args
    Analytics.getInstance().track('added funds', {
        success,
        entrypoint,
    })
}

export function trackConnectWallet(args: { walletName: string; entrypoint: Entrypoint }) {
    const { walletName, entrypoint } = args
    Analytics.getInstance().track('add funds connected wallet', {
        entrypoint,
        wallet: walletName,
    })
}

export function trackClickedAddFunds(args: { entrypoint: Entrypoint }) {
    const { entrypoint } = args
    Analytics.getInstance().track('clicked add funds', {
        entrypoint,
    })
}

export function trackFundWalletTxStart(
    args: Parameters<NonNullable<FundWalletCallbacks['onTxStart']>>[0],
    entrypoint: Entrypoint,
) {
    const { sourceChain, sourceAsset, sourceAmount } = args
    Analytics.getInstance().track('add funds initiate', {
        sourceChain,
        sourceAsset,
        sourceAmount,
        entrypoint,
    })
}
