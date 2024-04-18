import React, { useCallback } from 'react'
import { LoginStatus, useConnectivity } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, FancyButton } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { mapToErrorMessage } from '@components/Web3/utils'

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
    const { loginError, loginStatus: libLoginStatus } = useConnectivity()

    const errorMessage = loginError ? mapToErrorMessage(loginError) : undefined

    const isBusy = libLoginStatus === LoginStatus.LoggingIn || isAutoLoggingInToRiver

    const loginContent = () => {
        if (isAutoLoggingInToRiver) {
            return loggingInText
        }
        // on app load user starts in a logging in state.
        // The goal is to never show this button in that state.
        // but in case this component appears, just let the spinner show
        if (LoginStatus.LoggingIn === libLoginStatus) {
            return ''
        }
        return text
    }

    const onButtonClick = useCallback(async () => {
        if (!privyReady || isBusy) {
            return
        }
        await onLoginClick?.()
        await login()
    }, [onLoginClick, isBusy, login, privyReady])

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error logging in, please try again.',
    })

    if (LoginStatus.LoggingIn === libLoginStatus) {
        return <></>
    }

    return (
        <Box centerContent gap="lg">
            <Box width="100%">
                <FancyButton
                    cta
                    disabled={!privyReady || isBusy}
                    spinner={isBusy}
                    onClick={onButtonClick}
                >
                    {loginContent()}
                </FancyButton>
            </Box>
        </Box>
    )
}

function LoginWithAuth(props: LoginComponentProps) {
    return (
        <PrivyWrapper>
            <LoginComponent {...props} />
        </PrivyWrapper>
    )
}

export default LoginWithAuth
