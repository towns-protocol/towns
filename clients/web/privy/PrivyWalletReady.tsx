import React from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { TSigner } from 'use-towns-client'
import { getSigner } from './getSigner'

export type PrivyWalletReadyProps = {
    chainId: number
    children: (args: { getSigner: () => Promise<TSigner | undefined> }) => React.JSX.Element
    LoginButton?: React.JSX.Element
    WaitForPrivy?: React.JSX.Element
    WaitForWallets?: React.JSX.Element
}

export function PrivyWalletReady(props: PrivyWalletReadyProps) {
    const { chainId, children, LoginButton, WaitForPrivy, WaitForWallets } = props
    const { ready: privyReady, authenticated } = usePrivy()
    const { wallets, ready: walletsReady } = useWallets()
    const embeddedWallet = wallets.find((wallet) => wallet.walletClientType === 'privy')

    const getSignerWithCatch = async () => {
        try {
            return await getSigner(embeddedWallet, chainId)
        } catch (error) {
            console.error('[WalletReady]: Error fetching signer:', error)
        }
    }

    if (!privyReady) {
        return WaitForPrivy ?? <div>Loading...</div>
    }

    if (!authenticated) {
        return LoginButton ?? <div>Not authenticated</div>
    }

    if (!walletsReady) {
        return WaitForWallets ?? <div>Loading wallets...</div>
    }

    if (!embeddedWallet) {
        return LoginButton ?? <div>No embedded wallet found</div>
    }

    return children({ getSigner: getSignerWithCatch })
}
