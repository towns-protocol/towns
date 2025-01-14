import React from 'react'
import { Icon, Text } from '@ui'
import { Panel } from '@components/Panel/Panel'
import { PanelButton } from '@components/Panel/PanelButton'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useGetAssetSourceParam, useIsAAWallet } from './useGetWalletParam'
import { NftsList } from './NftsList'

export function SingleWalletPanel() {
    const isAAWallet = useIsAAWallet()
    const walletAddress = useGetAssetSourceParam()
    const { openPanel } = usePanelActions()

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
            <NftsList walletAddress={walletAddress} />
        </Panel>
    )
}
