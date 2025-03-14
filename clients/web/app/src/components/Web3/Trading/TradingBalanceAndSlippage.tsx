import { AnimatePresence } from 'framer-motion'
import React from 'react'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { FadeInBox } from '@components/Transitions'
import { Box, Paragraph, Stack } from '@ui'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { useTradingWalletBalance } from './hooks/useTradingBalance'
import { isTradingChain, tradingChains } from './tradingConstants'
import { useTokenBalance } from './useTokenBalance'
import { EditSlippageButton } from './EditSlippagePopover'

export const TradingBalanceAndSlippage = (props: {
    tokenAddress?: string
    mode: 'buy' | 'sell'
    chainId?: string
}) => {
    const { mode, chainId, tokenAddress } = props

    if (!chainId) {
        return
    }

    return (
        <Stack horizontal gap="sm" alignItems="center">
            {mode === 'buy' ? (
                <TradingWalletBalance chainId={chainId} />
            ) : tokenAddress ? (
                <TokenBalance chainId={chainId} tokenAddress={tokenAddress} />
            ) : null}
            <EditSlippageButton />
        </Stack>
    )
}

const TradingWalletBalance = (props: { chainId: string }) => {
    const { chainId } = props
    const chainConfig = isTradingChain(chainId) ? tradingChains[chainId] : tradingChains[1]
    const { walletBalance } = useTradingWalletBalance({ chainId })
    return (
        <Box>
            <TokenPrice
                value={formatUnitsToFixedLength(walletBalance, chainConfig.decimals, 2)}
                symbol={chainConfig.tokenSymbol}
            />
        </Box>
    )
}

const TokenBalance = (props: { chainId: string; tokenAddress: string }) => {
    const { chainId, tokenAddress } = props
    const tokenBalance = useTokenBalance(chainId, tokenAddress)
    const { data: tokenData } = useCoinData({ address: tokenAddress, chain: chainId })

    return tokenData ? (
        <Box>
            <TokenPrice
                value={formatUnitsToFixedLength(tokenBalance, tokenData.token.decimals, 2, {
                    compact: true,
                })}
                symbol={tokenData.token.symbol}
            />
        </Box>
    ) : null
}

const TokenPrice = (props: { value: string; symbol: string }) => {
    const { value, symbol } = props
    return (
        <AnimatePresence>
            {!!value && (
                <FadeInBox
                    background="lightHover"
                    paddingX="paragraph"
                    paddingY="sm"
                    borderRadius="md"
                    height="height_md"
                    justifyContent="center"
                >
                    <Paragraph size="sm" fontWeight="medium" color="gray2">
                        {value} {symbol}
                    </Paragraph>
                </FadeInBox>
            )}
        </AnimatePresence>
    )
}
