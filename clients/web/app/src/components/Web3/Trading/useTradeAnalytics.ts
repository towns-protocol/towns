import { useCallback, useContext, useMemo } from 'react'
import { ChannelContext } from 'use-towns-client'
import { getSpaceNameFromCache } from '@components/Analytics/getSpaceNameFromCache'
import { useGatherSpaceDetailsAnalytics } from '@components/Analytics/useGatherSpaceDetailsAnalytics'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Analytics } from 'hooks/useAnalytics'
import { tradingChains } from './tradingConstants'

export const useTradeAnalytics = (tokenProps?: { chainId: string; address?: string }) => {
    const spaceDetails = useSpaceTrackingData()
    const tokenDetails = useTokenTrackingData(tokenProps)

    const trackClickTokenMessage = useCallback(
        (props: { tradeAction: 'buy' | 'sell' }) => {
            const trackingData = {
                ...tokenDetails,
                ...spaceDetails,
                tradeAction: formatTradeAction(props.tradeAction),
            }
            Analytics.getInstance().track('clicked token message', trackingData)
        },
        [spaceDetails, tokenDetails],
    )

    const trackTradeSubmitted = useCallback(
        (props: {
            entryPoint: 'channel_thread' | 'wallet'
            tradeAction: 'buy' | 'sell'
            tradeAmount: string
            tradeValueUSD: string
            messageAdded: boolean
        }) => {
            const trackingData = {
                ...tokenDetails,
                ...spaceDetails,
                entryPoint: props.entryPoint,
                tradeAction: formatTradeAction(props.tradeAction),
                tradeAmount: props.tradeAmount,
                tradeValue: props.tradeValueUSD,
                messageAdded: props.messageAdded,
            }
            Analytics.getInstance().track('trade submitted', trackingData)
        },
        [spaceDetails, tokenDetails],
    )

    const trackTradeSuccess = useCallback(
        (props: {
            entryPoint: 'channel_thread' | 'wallet'
            tradeAction: 'buy' | 'sell'
            tradeAmount: string
            tradeValueUSD: string
        }) => {
            const trackingData = {
                ...tokenDetails,
                ...spaceDetails,
                entryPoint: props.entryPoint,
                tradeAction: formatTradeAction(props.tradeAction),
                tradeAmount: props.tradeAmount,
                tradeValue: props.tradeValueUSD,
            }
            Analytics.getInstance().track('trade success', trackingData)
        },
        [spaceDetails, tokenDetails],
    )

    const trackTradeFailed = useCallback(
        (props: {
            tradeAction: 'buy' | 'sell'
            tradeAmount: string
            tradeValueUSD: string
            reason: string
            entryPoint: 'channel_thread' | 'wallet'
        }) => {
            const trackingData = {
                reason: props.reason,
                ...tokenDetails,
                ...spaceDetails,
                entryPoint: props.entryPoint,
                tradeAction: formatTradeAction(props.tradeAction),
                tradeAmount: props.tradeAmount,
                tradeValue: props.tradeValueUSD,
            }
            Analytics.getInstance().track('trade failed', trackingData)
        },
        [spaceDetails, tokenDetails],
    )
    return {
        trackClickTokenMessage,
        trackTradeSubmitted,
        trackTradeSuccess,
        trackTradeFailed,
    }
}

const defaultSpaceProps = {
    spaceId: undefined,
    channelId: undefined,
}

const useSpaceTrackingData = () => {
    const spaceProps = useContext(ChannelContext) || defaultSpaceProps
    const spaceDetails = useGatherSpaceDetailsAnalytics(spaceProps)
    const spaceName = useMemo(() => {
        return getSpaceNameFromCache(spaceProps.spaceId)
    }, [spaceProps.spaceId])

    return useMemo(
        () => ({
            // spaceId, channelId,
            ...spaceProps,
            // gatedSpace, pricingModule, priceInWei, tokensGatedBy, channelName...
            ...spaceDetails,
            // spaceName
            spaceName,
        }),
        [spaceDetails, spaceName, spaceProps],
    )
}

export const useTokenTrackingData = (tokenProps?: { chainId: string; address?: string }) => {
    const chainId =
        tokenProps?.chainId === '1151111081099710' ? 'solana-mainnet' : tokenProps?.chainId

    const chainConfig = chainId ? tradingChains[chainId as keyof typeof tradingChains] : undefined
    const coinDataDisabled = chainConfig === undefined || tokenProps?.address === undefined

    const { data: coinData } = useCoinData({
        address: tokenProps?.address ?? '',
        chain: chainConfig?.chainId ?? '',
        disabled: coinDataDisabled,
    })

    return useMemo(
        () => ({
            tokenName: coinData?.token.name ?? '',
            tokenNetwork: chainConfig?.analyticName ?? '',
        }),
        [coinData, chainConfig],
    )
}

const formatTradeAction = (action: 'buy' | 'sell' | undefined) => {
    return action === 'buy' ? 'Buy' : action === 'sell' ? 'Sell' : undefined
}
