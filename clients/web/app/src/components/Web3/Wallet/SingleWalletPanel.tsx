import React, { useState } from 'react'
import { Box, Icon, Text } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { PanelButton } from '@components/Panel/PanelButton'
import { useBalance } from 'hooks/useBalance'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { CopyIcon, useCopied } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import useCopyToClipboard from 'hooks/useCopyToClipboard'
import { Analytics } from 'hooks/useAnalytics'
import { useGetAssetSourceParam, useIsAAWallet } from './useGetWalletParam'
import { NftsList } from './NftsList'
import { FundWalletModal } from './FundWalletModal'

export function SingleWalletPanel() {
    const isAAWallet = useIsAAWallet()
    const walletAddress = useGetAssetSourceParam()
    const { openPanel } = usePanelActions()
    const [isFundWalletModalOpen, setIsFundWalletModalOpen] = useState(false)

    const balance = useBalance({
        address: walletAddress || undefined,
        watch: true,
    })

    const onTransferAsset = () => {
        openPanel('transfer-assets', { assetSource: walletAddress })
    }

    const onFundWallet = () => {
        Analytics.getInstance().track('clicked add funds single wallet panel')
        setIsFundWalletModalOpen(true)
    }
    const [, copy] = useCopyToClipboard()
    const [copied, setCopied] = useCopied()

    if (!isAAWallet) {
        return <></>
    }

    const title = isAAWallet ? 'Towns Wallet' : ''

    return (
        <Panel label={title}>
            <PanelButton
                onClick={() => {
                    copy(walletAddress ?? '')
                    setCopied(true)
                }}
            >
                <CopyIcon copied={copied} color="gray2" />
                <Text strong>{shortAddress(walletAddress ?? '')}</Text>
            </PanelButton>
            <PanelButton cursor="pointer" onClick={onTransferAsset}>
                <Icon type="linkOutWithFrame" size="square_sm" color="gray2" />
                <Text strong>Transfer Asset</Text>
            </PanelButton>
            <PanelButton cursor="pointer" onClick={onFundWallet}>
                <Icon type="plus" size="square_sm" color="gray2" />
                <Text strong>Fund Wallet</Text>
            </PanelButton>
            <PanelButton hoverable={false} as="div" cursor="auto" height="auto">
                <Box width="height_md" alignItems="center">
                    <Icon type="base" size="square_lg" />
                </Box>
                <Box gap="sm">
                    <Text>
                        {balance.data?.formatted ?? 0} {balance.data?.symbol ?? ''}
                    </Text>
                    <Text size="sm" color="gray2">
                        Base
                    </Text>
                </Box>
            </PanelButton>
            <NftsList walletAddress={walletAddress} />
            <FundWalletModal isOpen={isFundWalletModalOpen} setIsOpen={setIsFundWalletModalOpen} />
        </Panel>
    )
}
