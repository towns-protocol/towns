import React, { useCallback, useMemo, useState } from 'react'
import { Panel } from '@components/Panel/Panel'
import { Box, Icon, IconName, Stack, Text } from '@ui'
import { PanelButton } from '@components/Panel/PanelButton'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CHANNEL_INFO_PARAMS } from 'routes'
import { calculateTotalHoldingValueCents, formatCents } from './tradingUtils'
import { useTradingWallet } from './useTradingWallet'
import { TradingTokensList } from './TradingTokensList'
import { AutoCreateSolanaWallet } from './AutoCreateSolanaWallet'
import { TabPanel } from './ui/TabPanel'
import { TradingActivity } from './TradingActivity'
import { useTradingWalletAddresses } from './useTradingWalletAddresses'
import { NftsList } from '../Wallet/NftsList'

export function TradingWalletPanel() {
    const { openPanel } = usePanelActions()
    const onClickDeposit = useCallback(() => {
        openPanel(CHANNEL_INFO_PARAMS.TRADING_DEPOSIT)
    }, [openPanel])

    const { evmWalletAddress } = useTradingWalletAddresses()
    const { data: chainWalletAssets } = useTradingWallet()
    const totalHoldingValueCents = useMemo(() => {
        return calculateTotalHoldingValueCents(chainWalletAssets)
    }, [chainWalletAssets])

    const onTransferAsset = () => {
        openPanel('transfer-assets', { assetSource: evmWalletAddress })
    }

    const holdingValue24hAgo = useMemo(() => {
        if (!chainWalletAssets) {
            return 0
        }
        return chainWalletAssets.reduce((acc, asset) => {
            const pct = 1 + asset.nativeAsset.priceChange24h
            const value24hAgo = asset.nativeAsset.holdingValueCents / pct
            const tokensValue24hAgo = asset.tokens.reduce((acc, token) => {
                const pct = 1 + token.priceChange24h
                return acc + token.holdingValueCents / pct
            }, 0)
            return acc + value24hAgo + tokensValue24hAgo
        }, 0)
    }, [chainWalletAssets])

    const gain24h = totalHoldingValueCents - holdingValue24hAgo
    const gain24hPct = holdingValue24hAgo === 0 ? 0 : (gain24h / holdingValue24hAgo) * 100

    const [tab, setTab] = useState('tokens')
    const onTabChange = useCallback((tab: string) => {
        setTab(tab)
    }, [])

    return (
        <Panel padding label="Towns Wallet">
            <AutoCreateSolanaWallet />

            <Stack gap grow>
                <Text fontSize="h2" fontWeight="strong" textAlign="center">
                    {formatCents(totalHoldingValueCents)}
                </Text>
                <Stack
                    horizontal
                    gap
                    alignItems="center"
                    alignSelf="center"
                    color={gain24hPct > 0 ? 'greenBlue' : 'error'}
                >
                    <Text>{formatCents(gain24h)}</Text>
                    <Box padding="xs" rounded="xs" color="inherit">
                        <Text>{gain24hPct.toFixed(2)}%</Text>
                    </Box>
                </Stack>

                <Stack horizontal gap padding>
                    <WalletActionButton iconName="plus" label="Deposit" onClick={onClickDeposit} />
                    <WalletActionButton iconName="linkOut" label="Send" onClick={() => {}} />
                </Stack>

                <Text fontSize="h4" textAlign="center" color="cta1" />
                <TabPanel
                    grow
                    layoutId="tradingTokensList"
                    value={tab}
                    tabs={[
                        { label: 'Tokens', value: 'tokens' },
                        { label: 'NFTs', value: 'nfts' },
                        { label: 'Activity', value: 'activity' },
                    ]}
                    onChange={onTabChange}
                >
                    <Stack gap paddingY grow>
                        {tab === 'tokens' && <TradingTokensList assets={chainWalletAssets ?? []} />}
                        {tab === 'nfts' && (
                            <Stack gap grow>
                                <PanelButton cursor="pointer" onClick={onTransferAsset}>
                                    <Icon type="linkOutWithFrame" size="square_sm" color="gray2" />
                                    <Text strong>Transfer Asset</Text>
                                </PanelButton>
                                <NftsList walletAddress={evmWalletAddress} />
                            </Stack>
                        )}
                        {tab === 'activity' && <TradingActivity />}
                    </Stack>
                </TabPanel>
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
