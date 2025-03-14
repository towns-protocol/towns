import React from 'react'
import { FadeInBox } from '@components/Transitions'
import { Box, Paragraph, Stack, Tooltip } from '@ui'
import { QuoteMetaData } from './types'
import { isTradingChain, tradingChains } from './tradingConstants'
import { TokenIcon } from './ui/TokenIcon'

export const TransactionTooltip = (props: {
    mode: 'buy' | 'sell'
    chainId: string
    tradeData: QuoteMetaData
    slippage: number
}) => {
    const { mode, tradeData, slippage } = props

    // a little workaround to cover the case where old tickers were posted
    // a temp chainId for solana
    const chainId = props.chainId === '1151111081099710' ? 'solana-mainnet' : props.chainId
    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]
    const slippageText = slippage ? `(± ${slippage * 100}%)` : ''

    return (
        <FadeInBox padding="sm">
            <Tooltip background="level2">
                <Stack horizontal padding="sm" gap="sm">
                    <Stack>
                        <Box position="relative" alignSelf="start">
                            <TokenIcon
                                asset={{
                                    imageUrl: tradeData.value.icon ?? '',
                                    chain: chainConfig.chainId,
                                }}
                            />
                        </Box>
                    </Stack>
                    <Stack gap="sm">
                        <Paragraph
                            color={mode === 'buy' ? 'positive' : 'peach'}
                            whiteSpace="nowrap"
                        >
                            {mode === 'buy' ? 'Buy' : 'Sell'} {tradeData.value.value}{' '}
                            {tradeData.value.symbol} {mode === 'buy' ? slippageText : ''}
                        </Paragraph>
                        <Paragraph color="gray1">
                            For {tradeData.valueAt.value} {tradeData.valueAt.symbol}{' '}
                            {mode === 'sell' ? slippageText : ''}
                        </Paragraph>
                    </Stack>
                </Stack>
            </Tooltip>
        </FadeInBox>
    )
}
