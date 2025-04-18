import React from 'react'
import { useAccount } from 'wagmi'
import { Box, Button, Stack } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'
import { shortAddress } from 'ui/utils/utils'
import { ConnectedWalletIcon } from './ConnectedWalletIcon'
import { useActiveWalletIsPrivy } from './useActiveWalletIsPrivy'

// wagmi's useAccount will return the "active" privy wallet, which can be set with useSetActiveWallet from @privy-io/wagmi
export function ConnectedWallet() {
    const { address, connector } = useAccount()
    const walletName = connector?.name?.toLowerCase()
    const activeWalletIsPrivy = useActiveWalletIsPrivy()

    if (!address || activeWalletIsPrivy) {
        return null
    }

    return (
        <Box
            horizontal
            alignItems="center"
            justifyContent="spaceBetween"
            gap="sm"
            background="transparent5"
            rounded="md"
            padding="sm"
        >
            <Stack horizontal gap="sm" alignItems="center">
                <ConnectedWalletIcon walletName={walletName} />
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
                tone="transparent5"
                icon="close"
                onClick={() => connector?.disconnect()}
            >
                Disconnect
            </Button>
        </Box>
    )
}
