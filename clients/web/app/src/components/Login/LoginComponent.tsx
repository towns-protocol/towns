import React from 'react'
import { LoginStatus } from 'use-zion-client'
import { useAuth } from 'hooks/useAuth'
import { Box, FancyButton } from '@ui'
import { useSwitchNetworkToast } from 'hooks/useSwitchNetworkToast'
import { useErrorToast } from 'hooks/useErrorToast'

export function LoginComponent() {
    const {
        login,
        loginError,
        riverLoginStatus: libLoginStatus,
        isLoggingInPostPrivySuccess,
    } = useAuth()

    const isSwitchNetworkToastVisible = useSwitchNetworkToast({
        postCta: 'to create a town.',
    })
    const errorMessage = loginError ? loginError.message : undefined

    const isBusy =
        libLoginStatus === LoginStatus.LoggingIn ||
        libLoginStatus === LoginStatus.Registering ||
        isLoggingInPostPrivySuccess

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error logging in, please try again.',
    })

    return (
        <Box centerContent gap="lg">
            <Box width="100%">
                <FancyButton
                    cta
                    disabled={isSwitchNetworkToastVisible || isBusy}
                    spinner={isBusy}
                    onClick={login}
                >
                    {isBusy ? 'Logging In...' : 'Login'}
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
