import React from 'react'
import { LoginStatus } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { useAuth } from 'hooks/useAuth'
import { Box, FancyButton } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { mapToErrorMessage } from '@components/Web3/utils'

export function LoginComponent() {
    const { ready: privyReady } = usePrivy()
    const {
        login,
        loginError,
        riverLoginStatus: libLoginStatus,
        isAutoLoggingInToRiver,
    } = useAuth()

    const errorMessage = loginError ? mapToErrorMessage(loginError) : undefined

    const isBusy =
        libLoginStatus === LoginStatus.LoggingIn ||
        libLoginStatus === LoginStatus.Registering ||
        isAutoLoggingInToRiver

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error logging in, please try again.',
    })

    return (
        <Box centerContent gap="lg">
            <Box width="100%">
                <FancyButton cta disabled={!privyReady || isBusy} spinner={isBusy} onClick={login}>
                    {isBusy ? 'Logging In...' : 'Login'}
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
