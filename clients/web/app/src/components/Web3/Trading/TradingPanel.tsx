import React, { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '@components/Panel/Panel'
import { TradingChart } from '@components/TradingChart/TradingChart'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Box, Stack, Text } from '@ui'
import { TradeComponent } from './TradeComponent'
import { TradingBalanceAndSlippage } from './TradingBalanceAndSlippage'

export const TradingPanel = () => {
    const [searchParams, setSearchParams] = useSearchParams()
    const { mode, tokenAddress, chainId } = Object.fromEntries(searchParams.entries())

    const { data: coinData } = useCoinData({
        address: tokenAddress ?? '',
        chain: chainId,
    })

    const onTabChanged = useCallback(
        (tab: string) => {
            searchParams.set('mode', tab)
            setSearchParams(searchParams, { replace: true })
        },
        [setSearchParams, searchParams],
    )

    return (
        <Panel
            padding
            label={
                <Stack horizontal gap="sm" alignItems="center">
                    <Text>Trade</Text>
                    <Text color="gray2">{coinData?.token.symbol}</Text>
                </Stack>
            }
        >
            <Box paddingX gap="none" insetX="sm">
                <Box elevate gap rounded="md" overflow="hidden" paddingBottom="md">
                    <TradingChart
                        address={tokenAddress ?? ''}
                        chainId={chainId}
                        disabled={!tokenAddress}
                    />
                </Box>
            </Box>

            <Box elevate padding gap="sm" rounded="md">
                <TradeComponent
                    mode={mode as 'buy' | 'sell'}
                    tokenAddress={tokenAddress as `0x${string}`}
                    chainId={chainId}
                    threadInfo={undefined}
                    onModeChanged={onTabChanged}
                />
                <Stack horizontal gap="sm" justifyContent="end">
                    <TradingBalanceAndSlippage
                        mode={mode as 'buy' | 'sell'}
                        chainId={chainId}
                        tokenAddress={tokenAddress as `0x${string}`}
                    />
                </Stack>
            </Box>
        </Panel>
    )
}
