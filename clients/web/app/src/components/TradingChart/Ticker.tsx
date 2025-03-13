import { TickerAttachment } from '@river-build/sdk'
import React, { useCallback, useContext } from 'react'
import { useInView } from 'react-intersection-observer'
import { shimmerClass } from 'ui/styles/globals/shimmer.css'
import { Box, Button, Paragraph, Stack, Text } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { TickerThreadContext } from '@components/MessageThread/TickerThreadContext'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { MessageTimelineContext } from '@components/MessageTimeline/MessageTimelineContext'
import { useOpenMessageThread } from 'hooks/useOpenThread'
import { useSizeContext } from 'ui/hooks/useSizeContext'
import { MessageAttachmentsContext } from '@components/MessageAttachments/MessageAttachmentsContext'
import { useCoinData } from './useCoinData'
import { TickerHeader } from './TickerInfoBox'
import { TradingChart } from './TradingChart'

export const Ticker = (props: {
    attachment: TickerAttachment
    eventId: string | undefined
    threadParentId: string | undefined
}) => {
    const tradingThreadContext = useContext(TickerThreadContext)

    if (tradingThreadContext && props.threadParentId !== props.eventId) {
        return (
            <MinimalTicker address={props.attachment.address} chainId={props.attachment.chainId} />
        )
    }

    return <TradingChartTicker {...props} />
}

export const MinimalTicker = (props: { address: string; chainId: string }) => {
    const { ref, inView } = useInView({
        rootMargin: '10px 0px',
    })
    const { address, chainId } = props

    const {
        data: coinData,
        isLoading,
        error,
    } = useCoinData({
        address,
        chain: chainId,
        disabled: !inView,
    })

    return (
        <Box
            padding
            background="level2"
            rounded="md"
            className={isLoading ? shimmerClass : ''}
            minHeight="x8"
            ref={ref}
        >
            {coinData ? (
                <TickerHeader minimal coinData={coinData} address={address} chainId={chainId} />
            ) : error ? (
                <Paragraph>Error loading coin data</Paragraph>
            ) : (
                <Paragraph color="gray1">Loading...</Paragraph>
            )}
        </Box>
    )
}

export const TradingChartTicker = (props: {
    attachment: TickerAttachment
    eventId: string | undefined
}) => {
    const { attachment, eventId } = props
    const { ref, inView } = useInView({
        rootMargin: '10px 0px',
    })
    const { openPanel } = usePanelActions()
    // a little workaround to cover the case where old tickers were posted
    // a temp chainId for solana
    const remappedChain =
        attachment.chainId === '1151111081099710' ? 'solana-mainnet' : attachment.chainId
    const { onOpenMessageThread } = useOpenMessageThread()

    const isTradeThreadContext = useContext(TickerThreadContext) !== undefined
    const timelineContext = useContext(MessageTimelineContext)

    const attachmentContext = useContext(MessageAttachmentsContext)

    const onTradeClick = useCallback(
        (mode: 'buy' | 'sell') => {
            // if the user is not in a space, open the trade panel
            // for now, we don't support threaded trading in DMs
            if (eventId && timelineContext?.spaceId) {
                onOpenMessageThread(eventId, {
                    mode,
                })
            } else {
                openPanel(CHANNEL_INFO_PARAMS.TRADE_PANEL, {
                    mode,
                    tokenAddress: attachment.address,
                    chainId: remappedChain,
                })
            }
        },
        [
            eventId,
            onOpenMessageThread,
            openPanel,
            attachment.address,
            remappedChain,
            timelineContext,
        ],
    )

    const { containerWidth } = useSizeContext()

    return (
        <Stack
            gap="paragraph"
            rounded="md"
            style={{
                width: 550,
                maxWidth: containerWidth - 80,
            }}
            background="level2"
            ref={ref}
            overflow="hidden"
            paddingBottom="md"
        >
            <TradingChart
                address={props.attachment.address}
                chainId={remappedChain}
                disabled={!inView}
            />

            {!isTradeThreadContext && !attachmentContext?.isMessageAttachementContext && (
                <Stack horizontal paddingX paddingY="none" gap="sm">
                    <Button
                        grow
                        size="button_x5"
                        tone="level3"
                        rounded="full"
                        color="cta1"
                        onClick={() => onTradeClick('buy')}
                    >
                        <Text>Buy</Text>
                    </Button>
                    <Button
                        grow
                        size="button_x5"
                        tone="level3"
                        rounded="full"
                        color="peach"
                        onClick={() => onTradeClick('sell')}
                    >
                        <Text>Sell</Text>
                    </Button>
                </Stack>
            )}
        </Stack>
    )
}
