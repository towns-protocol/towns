import React from 'react'
import { useSetActiveWallet } from '@privy-io/wagmi'
import { ConnectedWallet } from '@privy-io/react-auth'
import { Button, Icon } from '@ui'
import { usePrivyConnectWallet } from '../ConnectWallet/usePrivyConnectWallet'

export const ConnectAndSetActive = React.memo(
    (props: { onConnectWallet?: (wallet: ConnectedWallet) => void }) => {
        const { setActiveWallet } = useSetActiveWallet()
        const privyConnectWallet = usePrivyConnectWallet({
            onSuccess: async (wallet) => {
                await setActiveWallet(wallet as ConnectedWallet)
                props.onConnectWallet?.(wallet as ConnectedWallet)
            },
        })
        return (
            <Button rounded="full" tone="cta1" onClick={privyConnectWallet}>
                <Icon type="link" />
                Connect Wallet
            </Button>
        )
    },
)
