import React, { useCallback } from 'react'
import { AuthStatus, useConnectivity } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, FancyButton } from '@ui'
import { useStartupTime } from 'StartupProvider'
import { useJoinFunnelAnalytics } from '@components/Analytics/useJoinFunnelAnalytics'

type LoginComponentProps = {
    text?: React.ReactNode
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
    const [, resetStartupTime] = useStartupTime()
    const { privyModalShown } = useJoinFunnelAnalytics()

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
        resetStartupTime()
        onLoginClick?.()
        privyModalShown()
        await login()
    }, [privyReady, isBusy, privyModalShown, onLoginClick, login, resetStartupTime])

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
                    data-testid={`${text?.toString().toLowerCase()}-button`}
                    onClick={onButtonClick}
                >
                    {loginContent() as string}
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
