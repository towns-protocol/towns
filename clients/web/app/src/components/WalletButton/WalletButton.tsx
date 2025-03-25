import React, { useCallback, useEffect, useMemo } from 'react'

import { useBalanceOnChain } from '@components/Web3/Trading/useBalanceOnChain'
import { useSolanaBalance } from '@components/Web3/Trading/useSolanaBalance'
import { useTradingWalletAddresses } from '@components/Web3/Trading/useTradingWalletAddresses'
import { Box, Icon, Stack, Text } from '@ui'
import { Analytics } from 'hooks/useAnalytics'
import { formatUnitsToFixedLength } from 'hooks/useBalance'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

import {
    calculateHoldingByChainValueCents,
    calculateTotalHoldingValueCents,
    formatCents,
} from '@components/Web3/Trading/tradingUtils'
import { useTradingWallet } from '@components/Web3/Trading/useTradingWallet'
import { tradingChains } from '@components/Web3/Trading/tradingConstants'

let appStart = true

export const WalletButton = () => {
    const { closePanel, openPanel, isPanelOpen } = usePanelActions()
    const isActive = isPanelOpen(CHANNEL_INFO_PARAMS.TRADING_WALLET)

    const { data: chainWalletAssets } = useTradingWallet()
    const totalHoldingValueCents = useMemo(() => {
        return calculateTotalHoldingValueCents(chainWalletAssets)
    }, [chainWalletAssets])

    useEffect(() => {
        if (chainWalletAssets && appStart) {
            appStart = false
            try {
                const centsByChain = calculateHoldingByChainValueCents(chainWalletAssets)
                Analytics.getInstance().track(
                    'wallet loaded',
                    centsByChain
                        ? Object.entries(centsByChain).reduce((acc, [chain, cents]) => {
                              acc[tradingChains[chain as keyof typeof tradingChains].analyticName] =
                                  (cents / 100).toFixed(2)
                              return acc
                          }, {} as Record<string, string>)
                        : {},
                )
            } catch (error) {
                console.error(error)
            }
        }
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

export const EthSolWalletButton = () => {
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
