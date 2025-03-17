import React, { useState } from 'react'
import { useConnectivity } from 'use-towns-client'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Box, Icon, Text, TextButton } from '@ui'
import { useBalance } from 'hooks/useBalance'
import { useStore } from 'store/store'
import { PanelButton } from '@components/Panel/PanelButton'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { baseScanUrl } from '@components/Web3/utils'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useShowWallet } from 'hooks/useTradingEnabled'
import { trackClickedAddFunds } from './fundWalletAnalytics'

export function TownsWallet() {
    const { loggedInWalletAddress } = useConnectivity()
    const { data: aaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
    const { baseChain } = useEnvironment()
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    const balance = useBalance({
        address: aaAddress,
        watch: true,
    })
    const { openPanel } = usePanelActions()
    const [copied, setCopied] = useState(false)
    const [, copy] = useCopyToClipboard()

    const handleDeposit = () => {
        trackClickedAddFunds({ entrypoint: 'profile' })
        setFundWalletModalOpen(true)
    }

    const handleSend = () => {
        openPanel('transfer-assets', {
            assetSource: aaAddress,
            data: JSON.stringify({
                assetToTransfer: 'BASE_ETH',
            }),
        })
    }

    const handleViewAssets = () => {
        openPanel('wallet', { assetSource: aaAddress })
    }

    const handleCopy = async (e: React.MouseEvent) => {
        e.preventDefault()
        if (aaAddress) {
            const success = await copy(aaAddress)
            setCopied(success)
            if (success) {
                setTimeout(() => setCopied(false), 1000)
            }
        }
    }

    const isTradingEnabled = useShowWallet()

    if (isTradingEnabled) {
        return null
    }

    return (
        <Box padding rounded="sm" background="level2" gap="md">
            <Box gap="md">
                <Box horizontal justifyContent="spaceBetween" alignItems="center">
                    <Box horizontal alignItems="center" gap="sm">
                        <Text strong color="default">
                            Towns Wallet
                        </Text>
                        <Box
                            as="a"
                            href={`${baseScanUrl(baseChain.id)}/address/${aaAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', cursor: 'pointer' }}
                            opacity={{ hover: '0.8' }}
                        >
                            <Icon type="etherscan" size="square_sm" color="gray2" />
                        </Box>
                    </Box>
                    <TextButton onClick={handleViewAssets}>View Assets</TextButton>
                </Box>
                <Box centerContent gap="xs" paddingY="sm">
                    <Box horizontal alignItems="center" gap="sm">
                        <Icon type="baseEth" size="square_lg" />
                        <Text strong size="h3">
                            {balance.data?.formatted ?? 0} ETH
                        </Text>
                    </Box>
                </Box>
                <Box horizontal justifyContent="spaceBetween" display="flex" gap="sm">
                    <PanelButton
                        grow
                        centerContent
                        background="level3"
                        padding="md"
                        height="x10"
                        width="x12"
                        onClick={handleDeposit}
                    >
                        <Box direction="column" alignItems="center" gap="sm">
                            <Icon type="plus" size="square_sm" color="cta1" />
                            <Text size="md" color="greenBlue" paddingBottom="xs" paddingTop="xxs">
                                Deposit
                            </Text>
                        </Box>
                    </PanelButton>
                    <PanelButton
                        grow
                        centerContent
                        background="level3"
                        padding="md"
                        height="x10"
                        width="x12"
                        onClick={handleSend}
                    >
                        <Box direction="column" alignItems="center" gap="xs">
                            <Icon type="arrowRightUp" size="square_md" color="cta1" />
                            <Text size="md" color="greenBlue" paddingBottom="xs" paddingTop="xxs">
                                Send
                            </Text>
                        </Box>
                    </PanelButton>
                    <PanelButton
                        grow
                        centerContent
                        background="level3"
                        padding="md"
                        height="x10"
                        width="x12"
                        onClick={handleCopy}
                    >
                        <Box direction="column" alignItems="center" gap="sm">
                            {!copied ? (
                                <Icon type="copy" size="square_sm" color="cta1" />
                            ) : (
                                <Icon type="check" size="square_sm" color="cta1" />
                            )}
                            <Text size="md" color="greenBlue" paddingBottom="xs" paddingTop="xxs">
                                {copied ? 'Copied!' : 'Copy'}
                            </Text>
                        </Box>
                    </PanelButton>
                </Box>
            </Box>
        </Box>
    )
}
