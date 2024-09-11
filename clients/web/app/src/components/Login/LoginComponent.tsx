import React, { useCallback } from 'react'
import { AuthStatus, useConnectivity } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, FancyButton } from '@ui'
import { Analytics } from 'hooks/useAnalytics'

type LoginComponentProps = {
    text?: string
    loggingInText?: string
    onLoginClick?: () => void
}

function LoginComponent({
    text = 'Login',
    loggingInText = 'Logging In...',
    onLoginClick: onLoginClick,
}: LoginComponentProps) {
    const { ready: privyReady } = usePrivy()
    const { login, isAutoLoggingInToRiver } = useCombinedAuth()
    const { authStatus: libAuthStatus } = useConnectivity()

    const isBusy = libAuthStatus === AuthStatus.EvaluatingCredentials || isAutoLoggingInToRiver

    const loginContent = () => {
        if (isAutoLoggingInToRiver) {
            return loggingInText
        }
        // on app load user starts in a logging in state.
        // The goal is to never show this button in that state.
        // but in case this component appears, just let the spinner show
        if (AuthStatus.EvaluatingCredentials === libAuthStatus) {
            return ''
        }
        return text
    }

    const onButtonClick = useCallback(async () => {
        if (!privyReady || isBusy) {
            return
        }
        if (!onLoginClick) {
            Analytics.getInstance().track(
                'clicked login',
                {
                    buttonText: text,
                },
                () => {
                    console.log('[analytics][LoginComponent] clicked login')
                },
            )
        }
        await onLoginClick?.()
        await login()
    }, [privyReady, isBusy, onLoginClick, login, text])

    if (AuthStatus.EvaluatingCredentials === libAuthStatus) {
        return <></>
    }

    return (
        <Box centerContent gap="lg">
            <Box width="100%">
                <FancyButton
                    cta
                    disabled={!privyReady || isBusy}
                    spinner={isBusy}
                    data-testid={`${text.toLowerCase()}-button`}
                    onClick={onButtonClick}
                >
                    {loginContent()}
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
