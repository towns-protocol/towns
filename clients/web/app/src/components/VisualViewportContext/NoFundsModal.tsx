import React from 'react'
import { useBalance } from 'wagmi'
import { useAuth } from 'hooks/useAuth'
import { formatEthDisplay } from '@components/Web3/utils'
import { Box, Button, Text } from '@ui'
import { ClipboardCopy } from '@components/ClipboardCopy/ClipboardCopy'

export function NoFundsModal({ onHide }: { onHide: () => void }) {
    const { loggedInWalletAddress } = useAuth()
    const { data } = useBalance({
        address: loggedInWalletAddress,
    })
    const balance = formatEthDisplay(Number.parseFloat(data?.formatted ?? '0')) + ' ' + data?.symbol

    return (
        <Box gap background="level2" padding="lg" alignItems="center" width="350">
            <Text strong> You need ETH to join this town.</Text>
            <Text size="sm">Your balance: {balance}</Text>
            <Text size="sm" color="gray2">
                Transfer into your towns wallet:
            </Text>

            {loggedInWalletAddress && (
                <Box padding rounded="sm" background="level3">
                    <ClipboardCopy
                        color="default"
                        label={loggedInWalletAddress}
                        clipboardContent={loggedInWalletAddress}
                    >
                        <Box
                            display="block"
                            overflow="hidden"
                            style={{
                                width: '250px',
                                whiteSpace: 'nowrap',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {loggedInWalletAddress}
                        </Box>
                    </ClipboardCopy>
                </Box>
            )}
            <Button tone="cta1" width="100%" onClick={onHide}>
                OK
            </Button>
        </Box>
    )
}
