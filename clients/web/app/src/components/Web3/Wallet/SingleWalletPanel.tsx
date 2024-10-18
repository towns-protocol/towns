import React from 'react'
import { Box, Icon, Text } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { PanelButton } from '@components/Panel/PanelButton'
import { useBalance } from 'hooks/useBalance'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useGetAssetSourceParam, useIsAAWallet } from './useGetWalletParam'
import { NftsList } from './NftsList'

export function SingleWalletPanel() {
    const isAAWallet = useIsAAWallet()
    const walletAddress = useGetAssetSourceParam()
    const { openPanel } = usePanelActions()

    const balance = useBalance({
        address: walletAddress || undefined,
        watch: true,
    })

    const onTransferAsset = () => {
        openPanel('transfer-assets', { assetSource: walletAddress })
    }

    if (!isAAWallet) {
        return <></>
    }

    const title = isAAWallet ? 'Towns Wallet' : ''

    return (
        <Panel label={title}>
            <PanelButton cursor="pointer" onClick={onTransferAsset}>
                <Icon type="linkOutWithFrame" size="square_sm" color="gray2" />
                <Text strong>Transfer Asset</Text>
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
        </Panel>
    )
}
