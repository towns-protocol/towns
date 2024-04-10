import React from 'react'
import { LoginStatus, useConnectivity } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { PrivyWrapper } from 'privy/PrivyProvider'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, FancyButton } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { mapToErrorMessage } from '@components/Web3/utils'

function LoginComponent() {
    const { ready: privyReady } = usePrivy()
    const { login, isAutoLoggingInToRiver } = useCombinedAuth()
    const { loginError, loginStatus: libLoginStatus } = useConnectivity()

    const errorMessage = loginError ? mapToErrorMessage(loginError) : undefined

    const isBusy = libLoginStatus === LoginStatus.LoggingIn || isAutoLoggingInToRiver

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

function LoginWithAuth() {
    return (
        <PrivyWrapper>
            <LoginComponent />
        </PrivyWrapper>
    )
}

export default LoginWithAuth
