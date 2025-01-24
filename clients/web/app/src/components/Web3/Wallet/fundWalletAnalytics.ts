import { Analytics } from 'hooks/useAnalytics'

export function trackFundWalletTx(args: { success: boolean }) {
    const { success } = args
    Analytics.getInstance().track('added funds', {
        success,
    })
}
