import React from 'react'
import { useConnectivity } from 'use-towns-client'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'
import { useAbstractAccountAddress } from 'hooks/useAbstractAccountAddress'
import { Box, Button, Icon, IconButton, Text } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { useBalance } from 'hooks/useBalance'
import { Analytics } from 'hooks/useAnalytics'
import { useStore } from 'store/store'

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

    return (
        <>
            <Box
                horizontal
                padding
                rounded="sm"
                background="level2"
                justifyContent="spaceBetween"
                gap="md"
            >
                <Box gap="md">
                    <Box gap="sm">
                        <Text strong color="default">
                            Towns Wallet
                        </Text>
                        {aaAddress && (
                            <ClipboardCopy clipboardContent={aaAddress} fontSize="sm">
                                {shortAddress(aaAddress)}
                            </ClipboardCopy>
                        )}
                    </Box>
                    <Box gap="sm">
                        <Box horizontal alignItems="center" gap="xs" insetX="xxs">
                            <Icon type="eth" size="square_sm" />
                            <Text color="default">
                                {balance.data?.formatted ?? 0}{' '}
                                <Text strong as="span" display="inline">
                                    {balance.data?.symbol ?? ''}
                                </Text>
                            </Text>
                            <Icon type="base" size="square_sm" />
                        </Box>
                        <Box display="block" width="auto">
                            <Button
                                size="button_sm"
                                rounded="md"
                                color="cta1"
                                onClick={() => {
                                    Analytics.getInstance().track('clicked add funds')
                                    setFundWalletModalOpen(true)
                                }}
                            >
                                Add funds
                            </Button>
                        </Box>
                    </Box>
                </Box>
                <IconButton
                    inset="xs"
                    icon="linkOut"
                    tooltip="Details"
                    onClick={() => openPanel('wallet', { assetSource: aaAddress })}
                />
            </Box>
        </>
    )
}
