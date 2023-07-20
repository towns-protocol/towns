import React, { useCallback, useEffect, useRef, useState } from 'react'
import { signMessageAbortController } from 'use-zion-client'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Button, FancyButton, Icon, Stack, Text } from '@ui'
import { SignupButtonStatus } from 'hooks/useSignupButton'
import { useDebounce } from 'hooks/useDebounce'
import { Logo } from '@components/Logo'
import { atoms } from 'ui/styles/atoms.css'

type Props = {
    status: SignupButtonStatus
    onLoginClick: () => void
    isSpinning: boolean
    onHide: () => void
}

export function RequireTransactionNetworkModal({
    onHide,
    isSpinning,
    status,
    onLoginClick,
}: Props) {
    const timeoutId = useRef<ReturnType<typeof setTimeout> | undefined>()
    const { chainName } = useEnvironment()
    const buttonLabel = useDebounce(getButtonLabel(status, chainName), 500)
    const [showWalletCommsFailure, setShowWalletCommsFailure] = useState(false)
    const _onLoginClick = useCallback(() => {
        if (timeoutId.current) {
            setShowWalletCommsFailure(false)
            clearTimeout(timeoutId.current)
        }
        onLoginClick()
        timeoutId.current = setTimeout(() => {
            setShowWalletCommsFailure(true)
        }, 10_000)
    }, [onLoginClick])

    useEffect(() => {
        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current)
            }
        }
    }, [])

    function dismissWalletCommsMessage() {
        setShowWalletCommsFailure(false)
        signMessageAbortController.abort()
    }

    return (
        <ModalContainer touchTitle="Back" onHide={onHide}>
            <Stack
                height="100%"
                padding="sm"
                gap="lg"
                alignContent="center"
                justifyContent="center"
                alignItems="center"
            >
                <Logo className={atoms({ height: 'x6' })} />

                <Icon type="metamask" size="square_xl" />
                <Box gap horizontal border rounded="sm" padding="md" background="level2">
                    <Icon type="alert" color="error" />
                    <Text size="sm">
                        {`Looks like you're using MetaMask. To ensure a smooth login experience, please go to your wallet and make sure you are on the ${chainName} network.`}
                    </Text>
                </Box>

                <Box centerContent>
                    <Box opacity={isSpinning ? '0.5' : 'opaque'}>
                        <FancyButton
                            cta
                            spinner={isSpinning}
                            icon="wallet"
                            disabled={isSpinning}
                            onClick={_onLoginClick}
                        >
                            {buttonLabel ?? `Yes, I'm on ${chainName}`}
                        </FancyButton>
                    </Box>
                </Box>

                {showWalletCommsFailure && (
                    <>
                        <Text size="sm">
                            {`We're having trouble communicating with your wallet. `}
                        </Text>
                        <Button size="inline" tone="none" onClick={dismissWalletCommsMessage}>
                            <Text size="sm" color="cta1">{`Start over?`}</Text>
                        </Button>
                    </>
                )}
            </Stack>
        </ModalContainer>
    )
}

const getButtonLabel = (status: SignupButtonStatus, chainName: string) => {
    switch (status) {
        case SignupButtonStatus.ConnectUnlock:
        case SignupButtonStatus.WalletBusy:
            return 'Talking to wallet'
        case SignupButtonStatus.Login:
        case SignupButtonStatus.Register:
            return `Yes, I'm on ${chainName}`
        default:
            return 'Connect wallet'
    }
}
