import React, { useCallback } from 'react'
import { useConnect } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { Button } from '@ui'
import { useAuth } from 'hooks/useAuth'

type Props = {
    isConnected: boolean
}

export const WalletConnectButton = (props: Props) => {
    const { connect, connectors } = useConnect()

    const walletConnect = connectors?.find((c) => c instanceof WalletConnectConnector)

    const { isConnected } = props
    const { disconnect } = useAuth()
    const buttonClicked = useCallback(() => {
        if (isConnected) {
            disconnect()
        } else {
            connect({ connector: walletConnect })
        }
    }, [isConnected, disconnect, connect, walletConnect])

    return (
        <Button
            animate
            tone={isConnected ? 'level2' : 'cta1'}
            disabled={!walletConnect?.ready}
            onClick={buttonClicked}
        >
            {isConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
        </Button>
    )
}
