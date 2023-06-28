import React, { useCallback } from 'react'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { Button } from '@ui'
import { useAuth } from 'hooks/useAuth'
import '@rainbow-me/rainbowkit/styles.css'

type Props = {
    isConnected: boolean
}

export const RainbowKitLoginButton = (props: Props) => {
    const { openConnectModal } = useConnectModal()
    const { isConnected } = props
    const { disconnect } = useAuth()
    const buttonClicked = useCallback(() => {
        if (isConnected) {
            disconnect()
        } else {
            openConnectModal?.()
        }
    }, [isConnected, disconnect, openConnectModal])

    return (
        <Button animate tone={isConnected ? 'level2' : 'cta1'} onClick={buttonClicked}>
            {isConnected ? 'Disconnect Wallet' : 'Connect Wallet'}
        </Button>
    )
}
