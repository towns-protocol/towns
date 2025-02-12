import React, { useCallback, useMemo } from 'react'
import { Panel } from '@components/Panel/Panel'
import { Box, Icon, IconName, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { calculateTotalHoldingValueCents, formatCents } from './tradingUtils'
import { useTradingWallet } from './useTradingWallet'
import { TradingTokensList } from './TradingTokensList'
import { AutoCreateSolanaWallet } from './AutoCreateSolanaWallet'

export function TradingWalletPanel() {
    const { openPanel } = usePanelActions()
    const { data: chainWalletAssets } = useTradingWallet()
    const totalHoldingValueCents = useMemo(() => {
        return calculateTotalHoldingValueCents(chainWalletAssets)
    }, [chainWalletAssets])

    const onClickDeposit = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.TRADING_DEPOSIT)
    }, [openPanel])

    return (
        <Panel padding label="Towns Wallet">
            <AutoCreateSolanaWallet />

            <Stack gap>
                <Text fontSize="h2" fontWeight="strong" textAlign="center">
                    {formatCents(totalHoldingValueCents)}
                </Text>

                <Stack horizontal gap padding>
                    <WalletActionButton iconName="plus" label="Deposit" onClick={onClickDeposit} />
                    <WalletActionButton iconName="swap" label="Swap" onClick={() => {}} />
                    <WalletActionButton iconName="linkOut" label="Send" onClick={() => {}} />
                </Stack>

                <Text fontSize="h4" textAlign="center" color="cta1" />
                <TradingTokensList assets={chainWalletAssets ?? []} />
            </Stack>
        </Panel>
    )
}

const WalletActionButton = ({
    iconName,
    label,
    onClick,
}: {
    iconName: IconName
    label: string
    onClick: () => void
}) => {
    return (
        <PanelButton
            grow
            centerContent
            background="level2"
            padding="md"
            height="x10"
            width="x12"
            onClick={onClick}
        >
            <Box direction="column" alignItems="center" gap="sm">
                <Icon type={iconName} size="square_sm" color="cta2" />
                <Text
                    size="md"
                    color="gray2"
                    paddingBottom="xs"
                    paddingTop="xxs"
                    fontWeight="medium"
                >
                    {label}
                </Text>
            </Box>
        </PanelButton>
    )
}
