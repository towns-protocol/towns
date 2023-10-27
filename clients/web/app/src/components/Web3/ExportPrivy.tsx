import React from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { Button, Icon } from '@ui'

export function ExportWalletButton() {
    const { ready, authenticated, user, exportWallet } = usePrivy()
    const isAuthenticated = ready && authenticated
    // Check that your user has an embedded wallet
    const hasEmbeddedWallet = !!user?.linkedAccounts.find(
        (account) => account.type === 'wallet' && account.walletClientType === 'privy',
    )

    return (
        <Button
            size="button_sm"
            disabled={!isAuthenticated || !hasEmbeddedWallet}
            onClick={exportWallet}
        >
            <Icon type="wallet" />
            Export wallet
        </Button>
    )
}
