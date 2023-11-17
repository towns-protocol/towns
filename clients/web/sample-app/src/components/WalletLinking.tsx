import { Button, Stack, Typography } from '@mui/material'
import { ConnectedWallet, usePrivy, useWallets } from '@privy-io/react-auth'
import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLinkWalletTransaction, useZionClient } from 'use-zion-client'
import { useAccount } from 'wagmi'

export const WalletLinking = () => {
    const { authenticated: privyAuthenticated, connectWallet } = usePrivy()
    const { wallets } = useWallets()
    const { address: currentWalletAddress } = useAccount()
    const { getLinkedWallets } = useZionClient()
    const [linkedWallets, setLinkedWallets] = useState<string[]>([])

    const checkWallets = useCallback(async () => {
        if (!currentWalletAddress) {
            return
        }
        const linked = await getLinkedWallets(currentWalletAddress)
        console.log('wallets', linked, 'currentWalletAddress', currentWalletAddress)
        console.log('currentWalletAddress', currentWalletAddress)
        if (linked) {
            setLinkedWallets(linked)
        }
    }, [currentWalletAddress, getLinkedWallets])

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
            {/* <Typography>Wallets: {linkedWallets2}</Typography> */}
            <Button variant="contained" onClick={connectWallet}>
                Connect Wallet
            </Button>
            <Button variant="contained" onClick={checkWallets}>
                Check Linked Wallets
            </Button>
            <WalletList wallets={wallets} linkedWallets={linkedWallets} />
        </Stack>
    )
}

const WalletList = (props: { wallets: ConnectedWallet[]; linkedWallets: string[] }) => {
    return (
        <Stack spacing={2}>
            <Typography variant="body1">Wallets: {props.linkedWallets.join(',')}</Typography>
            {props.wallets.map((wallet) => (
                <WalletListItem wallet={wallet} key={wallet.address} />
            ))}
        </Stack>
    )
}

const WalletListItem = (props: { wallet: ConnectedWallet }) => {
    const wallet = props.wallet

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
                <WalletLinkButton wallet={wallet} />
            </Stack>
        </Stack>
    )
}

const WalletLinkButton = (props: { wallet: ConnectedWallet }) => {
    const { wallets } = useWallets()
    const { isLoading, linkWalletTransaction, unlinkWalletTransaction } = useLinkWalletTransaction()
    const { getLinkedWallets } = useZionClient()

    const [linkedWallets, setLinkedWallets] = useState<string[]>([])
    const wallet = props.wallet

    useEffect(() => {
        ;(async () => {
            const privy = findPrivyWallet(wallets)
            if (!privy) {
                return
            }
            const linked = await getLinkedWallets(privy.address)
            if (linked) {
                setLinkedWallets(linked)
            }
        })()
    }, [wallets, wallet, getLinkedWallets, isLoading])

    const onLinkClick = useCallback(async () => {
        const privy = findPrivyWallet(wallets)
        if (!privy) {
            return
        }
        const res = await linkWalletTransaction(
            (await privy.getEthersProvider()).getSigner(),
            (await wallet.getEthersProvider()).getSigner(),
        )
        console.log('linkWallet', res)
    }, [wallets, wallet, linkWalletTransaction])

    const onUnlinkClick = useCallback(async () => {
        const privy = findPrivyWallet(wallets)
        if (!privy) {
            return
        }
        // call unlinkWallet
        const res = await unlinkWalletTransaction(
            (await privy.getEthersProvider()).getSigner(),
            wallet.address,
        )
        console.log('removeLink', res)
    }, [wallets, wallet, unlinkWalletTransaction])

    const isLinked = (wallet: ConnectedWallet) => {
        if (!linkedWallets) {
            return false
        }
        return linkedWallets.includes(wallet.address)
    }

    switch (props.wallet.walletClientType) {
        case 'privy':
            return null
        case 'metamask':
        default:
            return isLinked(wallet) ? (
                <Button
                    variant="contained"
                    color="warning"
                    onClick={isLoading ? undefined : onUnlinkClick}
                >
                    {isLoading ? 'Loading...' : 'Unlink'}
                </Button>
            ) : (
                <Button
                    variant="contained"
                    color="primary"
                    onClick={isLoading ? undefined : onLinkClick}
                >
                    {isLoading ? 'Loading...' : 'Link'}
                </Button>
            )
    }
}

function findPrivyWallet(wallets: ConnectedWallet[]): ConnectedWallet | undefined {
    return wallets.find((w) => w.walletClientType === 'privy')
}
