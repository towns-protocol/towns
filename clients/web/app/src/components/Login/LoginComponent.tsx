import React from 'react'
import { useAuth } from 'hooks/useAuth'
import { Box, FancyButton } from '@ui'
import { useSwitchNetworkToast } from 'hooks/useSwitchNetworkToast'
import { useErrorToast } from 'hooks/useErrorToast'

export function LoginComponent() {
    const { login, loginError } = useAuth()

    const isSwitchNetworkToastVisible = useSwitchNetworkToast({
        postCta: 'to create a town.',
    })
    const errorMessage = loginError ? loginError.message : undefined

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error logging in, please try again.',
    })

    return (
        <Box centerContent gap="lg">
            <Box width="100%">
                <FancyButton cta disabled={isSwitchNetworkToastVisible} onClick={login}>
                    Login
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
