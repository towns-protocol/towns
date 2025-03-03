import React, { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Panel } from '@components/Panel/Panel'
import { TradingChart } from '@components/TradingChart/TradingChart'
import { useCoinData } from '@components/TradingChart/useCoinData'
import { Box, Stack, Text } from '@ui'
import { TradeComponent } from './TradeComponent'

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
            <Box gap insetX="sm" insetTop="sm">
                <TradingChart
                    address={tokenAddress ?? ''}
                    chainId={chainId}
                    disabled={!tokenAddress}
                />
            </Box>

            <TradeComponent
                mode={mode as 'buy' | 'sell'}
                tokenAddress={tokenAddress as `0x${string}`}
                chainId={chainId}
                onModeChanged={onTabChanged}
            />
        </Panel>
    )
}
