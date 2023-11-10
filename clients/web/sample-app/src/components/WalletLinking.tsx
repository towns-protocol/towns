import { Box, Button, Stack, Typography } from '@mui/material'
import { ConnectedWallet, usePrivy, useWallets } from '@privy-io/react-auth'
import React from 'react'
import { Link } from 'react-router-dom'

export const WalletLinking = () => {
    const { authenticated: privyAuthenticated, linkWallet } = usePrivy()
    const { wallets } = useWallets()

    if (!privyAuthenticated) {
        return (
            <>
                Not authenticated, please <Link to="/logins"> login</Link>
            </>
        )
    }

    const connectWallet = () => {
        linkWallet()
    }

    return (
        <Stack spacing={2}>
            <Typography>Actions:</Typography>
            <Button variant="contained" onClick={connectWallet}>
                Link Wallet
            </Button>
            <WalletList wallets={wallets} />
        </Stack>
    )
}

const WalletList = (props: { wallets: ConnectedWallet[] }) => {
    return (
        <Stack spacing={2}>
            <Typography variant="body1">Wallets:</Typography>
            {props.wallets.map((wallet) => (
                <WalletListItem wallet={wallet} key={wallet.address} />
            ))}
        </Stack>
    )
}

const WalletListItem = (props: { wallet: ConnectedWallet }) => {
    const { wallet } = props
    const onUnlinkClick = () => {
        wallet.unlink()
    }
    const onLinkClick = () => {
        wallet.loginOrLink()
    }

    return (
        <Stack key={wallet.chainId} sx={{ border: `solid`, padding: 2 }} spacing={1}>
            <Typography variant="body2">
                <strong>walletClientType: </strong> {wallet.walletClientType}
                <br />
                <strong>address:</strong> {wallet.address}
                <br />
                <strong>chainId:</strong> {wallet.chainId}
                {wallet.walletClientType}
            </Typography>
            <Stack direction="row" spacing={2}>
                {wallet.linked ? (
                    <Button variant="contained" color="warning" onClick={onUnlinkClick}>
                        Unlink
                    </Button>
                ) : (
                    <Button variant="contained" color="primary" onClick={onLinkClick}>
                        Link
                    </Button>
                )}
            </Stack>
        </Stack>
    )
}
