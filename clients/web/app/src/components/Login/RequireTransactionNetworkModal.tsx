import React, { useCallback, useEffect, useRef, useState } from 'react'
import { signMessageAbortController } from 'use-zion-client'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, FancyButton, Icon, Paragraph, Stack, Text } from '@ui'
import { atoms } from 'ui/styles/atoms.css'
import { useAuth } from 'hooks/useAuth'
import { FadeInBox } from '@components/Transitions'

export type Props = {
    onLoginClick: () => void
    isSpinning: boolean
    onHide: () => void
}

export function RequireTransactionNetworkModal({ onHide, isSpinning, onLoginClick }: Props) {
    const timeoutId = useRef<ReturnType<typeof setTimeout> | undefined>()
    const { chainName } = useEnvironment()
    const [showWalletCommsFailure, setShowWalletCommsFailure] = useState(false)
    const clicked = useRef(false)

    const _onLoginClick = useCallback(() => {
        if (clicked.current) {
            return
        }
        if (timeoutId.current) {
            clearTimeout(timeoutId.current)
        }
        onLoginClick()
        timeoutId.current = setTimeout(() => {
            setShowWalletCommsFailure(true)
            clicked.current = false
        }, 8000)
    }, [onLoginClick])

    useEffect(() => {
        return () => {
            if (timeoutId.current) {
                clearTimeout(timeoutId.current)
            }
        }
    }, [])

    function dismissWalletCommsMessage() {
        clicked.current = false
        setShowWalletCommsFailure(false)
        signMessageAbortController.abort()
    }

    const { loginError } = useAuth()
    const errorMessage = loginError ? loginError.message : null

    return (
        <ModalContainer onHide={onHide}>
            <Stack
                height="100%"
                padding="sm"
                gap="lg"
                alignContent="center"
                justifyContent="center"
                alignItems="center"
            >
                <Stack horizontal centerContent gap>
                    <Icon type="metamask" size="square_lg" />
                    <Text strong size="lg">
                        Hold up!
                    </Text>
                </Stack>
                <Text size="sm" textAlign="center">
                    {`Looks like you're using MetaMask. To ensure a smooth login experience, we recommend switching to 
                        the correct network before proceeding.`}
                </Text>
                <Text size="sm" textAlign="center">
                    Please go to your wallet and make sure you are on the{' '}
                    <span
                        className={atoms({
                            color: 'cta1',
                        })}
                    >
                        {chainName}
                    </span>{' '}
                    network.
                </Text>

                <Box centerContent>
                    <Box opacity={isSpinning ? '0.5' : 'opaque'}>
                        <FancyButton
                            cta
                            spinner={isSpinning}
                            icon="wallet"
                            disabled={isSpinning}
                            onClick={_onLoginClick}
                        >
                            {isSpinning ? 'Talking to wallet' : `Yes, I'm on ${chainName}`}
                        </FancyButton>
                    </Box>
                </Box>

                {showWalletCommsFailure && (
                    <>
                        <FadeInBox
                            hoverable
                            background="level2"
                            rounded="xs"
                            layout="position"
                            cursor="pointer"
                            padding="md"
                        >
                            <Paragraph size="sm" textAlign="center">
                                This is taking a while. Please check your wallet for any prompts.
                            </Paragraph>
                            <Paragraph size="sm" textAlign="center">
                                If issues persist, try{' '}
                                <Box
                                    display="inline"
                                    color="cta1"
                                    onClick={dismissWalletCommsMessage}
                                >
                                    starting over.
                                </Box>
                            </Paragraph>
                        </FadeInBox>
                    </>
                )}

                {errorMessage && (
                    <Text color="negative" size="sm">
                        {errorMessage}
                    </Text>
                )}
            </Stack>
        </ModalContainer>
    )
}
