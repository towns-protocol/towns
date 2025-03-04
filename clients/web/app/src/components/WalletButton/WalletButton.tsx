import React, { useCallback } from 'react'

import { Box, Icon, Stack, Text } from '@ui'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { Analytics } from 'hooks/useAnalytics'
import { useTradingWalletAddresses } from '@components/Web3/Trading/useTradingWalletAddresses'
import { useBalanceOnChain } from '@components/Web3/Trading/useBalanceOnChain'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { useSolanaBalance } from '@components/Web3/Trading/useSolanaBalance'

export const WalletButton = () => {
    const { closePanel, openPanel, isPanelOpen } = usePanelActions()
    const isActive = isPanelOpen(CHANNEL_INFO_PARAMS.TRADING_WALLET)

    const { evmWalletAddress, solanaWalletAddress } = useTradingWalletAddresses()
    const { data: evmBalance } = useBalanceOnChain(evmWalletAddress, 8453)
    const { data: solanaBalance } = useSolanaBalance(solanaWalletAddress)

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
            paddingY="line"
            paddingX="sm"
            background="level2"
            alignSelf="center"
            rounded="sm"
            minWidth="x4"
            height="x4"
            data-testid="towns-wallet-button"
            gap="xs"
            onClick={onWalletClick}
        >
            <Icon type="solana" size="square_sm" />
            <Text color="default" fontSize="sm" fontWeight="medium">
                {formatUnitsToFixedLength(solanaBalance, 9, 2)}
            </Text>
            <Box borderRight="level3" height="75%" width="1" paddingLeft="xs" />
            <Icon type="baseEthLight" size="square_sm" />
            <Text color="default" fontSize="sm" fontWeight="medium">
                {formatUnitsToFixedLength(evmBalance, 18, 2)}
            </Text>
        </Stack>
    )
}
