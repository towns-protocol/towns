import React from 'react'
import { LoginStatus } from 'use-zion-client'
import { useAuth } from 'hooks/useAuth'
import { Box, FancyButton } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'

export function LoginComponent() {
    const {
        login,
        loginError,
        riverLoginStatus: libLoginStatus,
        isAutoLoggingInToRiver,
    } = useAuth()

    const errorMessage = loginError ? loginError.message : undefined

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
                <FancyButton cta disabled={isBusy} spinner={isBusy} onClick={login}>
                    {isBusy ? 'Logging In...' : 'Login'}
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
