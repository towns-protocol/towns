import { useConnectModal } from '@rainbow-me/rainbowkit'
import '@rainbow-me/rainbowkit/styles.css'
import React, { useCallback } from 'react'
import { Button } from '@ui'
import { FancyButton } from 'ui/components/Button/FancyButton'

export const RainbowKitLoginButton = () => {
    const { openConnectModal } = useConnectModal()
    const buttonClicked = useCallback(() => {
        openConnectModal?.()
    }, [openConnectModal])

    return (
        <FancyButton cta icon="wallet" key="fancy-button" onClick={buttonClicked}>
            Connect Wallet
        </FancyButton>
    )
}

export const RainbowKitLoginPublicButton = () => {
    const { openConnectModal } = useConnectModal()
    const buttonClicked = useCallback(() => {
        openConnectModal?.()
    }, [openConnectModal])

    return (
        <Button tone="cta1" width="100%" icon="wallet" onClick={buttonClicked}>
            Connect to Join Town
        </Button>
    )
}
