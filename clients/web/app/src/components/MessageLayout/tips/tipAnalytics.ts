import { calculateEthAmountFromUsd, ensureEthPrice } from '@components/Web3/useEthPrice'
import { Analytics } from 'hooks/useAnalytics'

export const trackTipOnMessage = (location: 'messageActions' | 'messageReaction') => {
    Analytics.getInstance().track('clicked tip on message', {
        location, // 'messageActions' | 'messageReaction'
    })
}

export const trackTipAmount = async (cents: number) => {
    try {
        const ethPrice = await ensureEthPrice()
        const ethAmount = calculateEthAmountFromUsd({
            cents,
            ethPriceInUsd: ethPrice,
        })
        Analytics.getInstance().track('clicked tip amount', {
            tipAmount: ethAmount.formatted, // in ETH- eg 0.005
            tipAmountUsd: formatUsd(cents),
        })
    } catch (error) {
        console.error('Error tracking tip amount', error)
    }
}

export const trackPostedTip = (args: {
    cents: number
    tipAmount: string
    receipient: string
    spaceName: string
    spaceId: string
    isGated: boolean
    pricingModule: 'fixed' | 'dynamic' | 'free'
}) => {
    const { tipAmount, receipient, spaceName, spaceId, isGated, pricingModule, cents } = args
    Analytics.getInstance().track('posted tip', {
        tipAmountUsd: formatUsd(cents),
        tipAmount, // in ETH- eg 0.005
        receipient, // address
        spaceName,
        spaceId,
        isGated, // boolean
        pricingModule, // pricing model of space 'fixed' | 'dynamic' | 'free'
    })
}

function formatUsd(cents: number) {
    return (cents / 100)
        .toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD',
        })
        .replace('$', '')
}
