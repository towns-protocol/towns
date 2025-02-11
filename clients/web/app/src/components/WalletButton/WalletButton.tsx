import React, { useCallback, useMemo } from 'react'

import { Icon, Stack, Text } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { Analytics } from 'hooks/useAnalytics'
import { calculateTotalHoldingValueCents, formatCents } from '@components/Web3/Trading/tradingUtils'
import { useTradingWallet } from '@components/Web3/Trading/useTradingWallet'

export const WalletButton = () => {
    const { closePanel, openPanel, isPanelOpen } = usePanelActions()
    const isActive = isPanelOpen(CHANNEL_INFO_PARAMS.TRADING_WALLET)

    const { data: chainWalletAssets } = useTradingWallet()
    const totalHoldingValueCents = useMemo(() => {
        return calculateTotalHoldingValueCents(chainWalletAssets)
    }, [chainWalletAssets])

    const onWalletClick = useCallback(() => {
        if (isPanelOpen(CHANNEL_INFO_PARAMS.TRADING_WALLET)) {
            closePanel()
        } else {
            Analytics.getInstance().track('clicked trading wallet')
            openPanel(CHANNEL_INFO_PARAMS.TRADING_WALLET)
        }
    }, [closePanel, isPanelOpen, openPanel])

    return (
        <Stack
            horizontal
            hoverable
            centerContent
            cursor="pointer"
            tooltip={isActive ? undefined : 'Towns Wallet'}
            tooltipOptions={{ placement: 'horizontal' }}
            padding="line"
            background="level2"
            alignSelf="center"
            rounded="sm"
            minWidth="x4"
            height="x4"
            data-testid="towns-wallet-button"
            gap="sm"
            onClick={onWalletClick}
        >
            <Icon size="square_sm" type="wallet" color={isActive ? 'default' : 'gray1'} />
            {totalHoldingValueCents > 0 && (
                <Text color="default" fontSize="sm" fontWeight="medium">
                    {formatCents(totalHoldingValueCents)}
                </Text>
            )}
        </Stack>
    )
}
