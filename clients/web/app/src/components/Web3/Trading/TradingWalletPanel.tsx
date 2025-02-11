import React, { useMemo } from 'react'
import { Panel } from '@components/Panel/Panel'
import { Stack, Text } from '@ui'
import { calculateTotalHoldingValueCents, formatCents } from './tradingUtils'
import { useTradingWallet } from './useTradingWallet'
import { TradingTokensList } from './TradingTokensList'

export function TradingWalletPanel() {
    const { data: chainWalletAssets } = useTradingWallet()
    const totalHoldingValueCents = useMemo(() => {
        return calculateTotalHoldingValueCents(chainWalletAssets)
    }, [chainWalletAssets])

    return (
        <Panel padding label="Towns Wallet">
            <Stack gap>
                <Text fontSize="h2" fontWeight="strong" textAlign="center">
                    {formatCents(totalHoldingValueCents)}
                </Text>
                <Text fontSize="h4" textAlign="center" color="cta1" />
                <TradingTokensList assets={chainWalletAssets ?? []} />
            </Stack>
        </Panel>
    )
}
