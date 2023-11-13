import { Button, Stack, Typography } from '@mui/material'
import { ConnectedWallet, usePrivy, useWallets } from '@privy-io/react-auth'
import React, { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWeb3Context, useZionClient } from 'use-zion-client'
import { useAccount } from 'wagmi'

export const WalletLinking = () => {
    const { authenticated: privyAuthenticated, connectWallet, signMessage, user } = usePrivy()
    const { wallets } = useWallets()
    const { address: currentWalletAddress } = useAccount()
    const { accounts } = useWeb3Context()
    const { getLinkedWallets } = useZionClient()

    useEffect(() => {
        ;(async () => {
            console.log('wallets', wallets)
            if (privyAuthenticated) {
                const msg = await signMessage('hello world')
                console.log('msg', msg)
                console.log('currentWalletAddress', currentWalletAddress)
                console.log('accounts', accounts)
                console.log('linked accounts', user?.linkedAccounts)

                if (currentWalletAddress) {
                    const linkedWallets = await getLinkedWallets(currentWalletAddress)
                    console.log('linkedWallets', linkedWallets)
                }
            }
        })()
    }, [
        wallets,
        privyAuthenticated,
        signMessage,
        currentWalletAddress,
        accounts,
        getLinkedWallets,
        user?.linkedAccounts,
    ])

    if (!privyAuthenticated) {
        return (
            <>
                Not authenticated, please <Link to="/logins"> login</Link>
            </>
        )
    }

    return (
        <Stack spacing={2}>
            <Typography>Actions:</Typography>
            <Button variant="contained" onClick={connectWallet}>
                Connect Wallet
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
    const { linkWallet } = useZionClient()
    const { wallets } = useWallets()

    const { wallet } = props
    const onDisconnectClick = () => {
        wallet.unlink()
    }
    const onConnectClick = () => {
        wallet.loginOrLink()
    }
    const onLinkClick = async () => {
        console.log('provider: ', await wallets[0].getWeb3jsProvider())
        const res = await linkWallet(
            (await wallets[0].getEthersProvider()).getSigner(),
            (await wallet.getEthersProvider()).getSigner(),
        )
        console.log('signedMessage', res)
        // call linkWallet
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
                    <Button variant="contained" color="warning" onClick={onDisconnectClick}>
                        Disconnect
                    </Button>
                ) : (
                    <Button variant="contained" color="primary" onClick={onConnectClick}>
                        Connect
                    </Button>
                )}
            </Stack>
            <Stack direction="row" spacing={2}>
                {wallet.walletClientType === 'metamask' && wallet.linked ? (
                    <Button variant="contained" color="primary" onClick={onLinkClick}>
                        Link
                    </Button>
                ) : null}
            </Stack>
        </Stack>
    )
}
