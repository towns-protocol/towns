import React, { useState } from 'react'
import { useConnectivity } from 'use-towns-client'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Box, Icon, Text, TextButton } from '@ui'
import { useBalance } from 'hooks/useBalance'
import { Analytics } from 'hooks/useAnalytics'
import { useStore } from 'store/store'
import { PanelButton } from '@components/Panel/PanelButton'
import useCopyToClipboard from 'hooks/useCopyToClipboard'

export function TownsWallet() {
    const { loggedInWalletAddress } = useConnectivity()
    const { data: aaAddress } = useAbstractAccountAddress({
        rootKeyAddress: loggedInWalletAddress,
    })
    const setFundWalletModalOpen = useStore((state) => state.setFundWalletModalOpen)
    const balance = useBalance({
        address: aaAddress,
        watch: true,
    })
    const { openPanel } = usePanelActions()
    const [copied, setCopied] = useState(false)
    const [, copy] = useCopyToClipboard()

    const handleDeposit = () => {
        Analytics.getInstance().track('clicked add funds')
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

    return (
        <Box padding rounded="sm" background="level2" gap="md">
            <Box gap="md">
                <Box horizontal justifyContent="spaceBetween" alignItems="center">
                    <Box horizontal alignItems="center" gap="sm">
                        <Text strong color="default">
                            Towns Wallet
                        </Text>
                        <Icon type="base" size="square_sm" color="gray2" />
                    </Box>
                    <TextButton onClick={handleViewAssets}>View Assets</TextButton>
                </Box>
                <Box centerContent gap="xs" paddingY="sm">
                    <Box horizontal alignItems="center" gap="xs">
                        <Icon type="eth" size="square_md" color="cta1" />
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
                        height="x8"
                        width="x12"
                        onClick={handleDeposit}
                    >
                        <Box direction="column" alignItems="center" gap="xs">
                            <Icon type="plus" size="square_xs" color="cta1" />
                            <Text size="sm" color="cta1">
                                Deposit
                            </Text>
                        </Box>
                    </PanelButton>
                    <PanelButton
                        grow
                        centerContent
                        background="level3"
                        padding="md"
                        height="x8"
                        width="x12"
                        onClick={handleSend}
                    >
                        <Box direction="column" alignItems="center" gap="xs">
                            <Icon type="arrowRight" size="square_xs" color="cta1" />
                            <Text size="sm" color="cta1">
                                Send
                            </Text>
                        </Box>
                    </PanelButton>
                    <PanelButton
                        grow
                        centerContent
                        background="level3"
                        padding="md"
                        height="x8"
                        width="x12"
                        onClick={handleCopy}
                    >
                        <Box direction="column" alignItems="center" gap="xs">
                            {!copied ? (
                                <Icon type="copy" size="square_xs" color="cta1" />
                            ) : (
                                <Icon type="check" size="square_xs" color="positive" />
                            )}
                            <Text size="sm" color={copied ? 'positive' : 'cta1'}>
                                {copied ? 'Copied!' : 'Copy'}
                            </Text>
                        </Box>
                    </PanelButton>
                </Box>
            </Box>
        </Box>
    )
}
