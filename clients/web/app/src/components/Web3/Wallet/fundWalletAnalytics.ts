import { Analytics } from 'hooks/useAnalytics'
import { FundWalletCallbacks } from '../Decent/fund/types'

export function trackFundWalletTx(args: { success: boolean; entrypoint: 'joinspace' | 'profile' }) {
    const { success, entrypoint } = args
    Analytics.getInstance().track('added funds', {
        success,
        entrypoint,
    })
}

export function trackConnectWallet(args: {
    walletName: string
    entrypoint: 'joinspace' | 'profile'
}) {
    const { walletName, entrypoint } = args
    Analytics.getInstance().track('add funds connected wallet', {
        entrypoint,
        wallet: walletName,
    })
}

export function trackFundWalletTxStart(
    args: Parameters<NonNullable<FundWalletCallbacks['onTxStart']>>[0],
) {
    const { sourceChain, sourceAsset, sourceAmount } = args
    Analytics.getInstance().track('add funds tx start', {
        sourceChain,
        sourceAsset,
        sourceAmount,
    })
}
