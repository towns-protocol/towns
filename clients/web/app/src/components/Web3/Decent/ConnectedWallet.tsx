import React from 'react'
import { useAccount } from 'wagmi'
import { Box, Button, Icon, IconName, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'

const iconMap: Record<string, IconName> = {
    metamask: 'metamask',
}

export function ConnectedWallet() {
    const { address, connector } = useAccount()
    const walletName = connector?.name?.toLowerCase()

    if (!address) {
        return null
    }

    return (
        <Box
            horizontal
            alignItems="center"
            justifyContent="spaceBetween"
            gap="sm"
            background="level2"
            rounded="md"
            padding="sm"
        >
            <Stack horizontal gap="sm" alignItems="center">
                <Icon type={walletName ? iconMap[walletName] : 'wallet'} />
                {address && (
                    <ClipboardCopy color="default" clipboardContent={address}>
                        {shortAddress(address)}
                    </ClipboardCopy>
                )}
            </Stack>
            <Button
                size="button_sm"
                rounded="md"
                color="gray2"
                icon="close"
                onClick={() => connector?.disconnect()}
            >
                Disconnect
            </Button>
        </Box>
    )
}
