import React, { useEffect } from 'react'
import headlessToast, { toast } from 'react-hot-toast/headless'
import { LoginError, useAuth } from 'hooks/useAuth'
import { Box, FancyButton } from '@ui'
import { useSwitchNetworkToast } from 'hooks/useSwitchNetworkToast'
import { ErrorNotification } from '@components/Notifications/ErrorNotifcation'

export function LoginComponent() {
    const { login, loginError } = useAuth()

    const isSwitchNetworkToastVisible = useSwitchNetworkToast({
        postCta: 'to create a town.',
    })
    useLoginErrorToast(loginError)

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

function useLoginErrorToast(loginError: LoginError) {
    const errorMessage = loginError ? loginError.message : null

    useEffect(() => {
        let toastId: string | undefined
        const dismissToast = () => {
            if (toastId) {
                headlessToast.dismiss(toastId)
            }
        }

        if (errorMessage) {
            toastId = toast.custom(
                (t) => {
                    return (
                        <ErrorNotification
                            toast={t}
                            errorMessage={errorMessage}
                            contextMessage="There was an error logging in, please try again."
                        />
                    )
                },
                {
                    duration: Infinity,
                },
            )
        } else {
            dismissToast()
        }

        return () => {
            dismissToast()
        }
    }, [errorMessage, loginError])
}

export default LoginComponent
