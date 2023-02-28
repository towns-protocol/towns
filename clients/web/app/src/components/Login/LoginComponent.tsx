import React, { useEffect } from 'react'
import { useAuth } from 'hooks/useAuth'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { Box, Text } from '@ui'
import { LoginButton } from './LoginButton/LoginButton'

export const LoginComponent = () => {
    const {
        loginStatus,
        loginError,
        login,
        register,
        walletStatus,
        connect,
        pendingConnector,
        connectError,
        connectLoading,
    } = useAuth()

    useEffect(() => {
        console.log('LoginComponent wagmi info:', {
            walletStatus,
            error: connectError,
            isLoading: connectLoading,
            pendingConnector,
            loginError,
        })
    }, [connectError, connectLoading, loginError, pendingConnector, walletStatus])

    const {
        status,
        onClick: onButtonClick,
        isSpinning,
    } = useSignupButton({
        walletStatus,
        loginStatus,
        connect,
        register,
        login,
    })

    const buttonLabel = getButtonLabel(status)
    const errorMessage = loginError ? loginError.message : getErrorMessage(status)

    return (
        <Box centerContent gap="md">
            <LoginButton
                label={buttonLabel}
                loading={isSpinning}
                icon="wallet"
                onClick={onButtonClick}
            />
            {errorMessage && (
                <Text color="negative" size="sm">
                    {errorMessage}
                </Text>
            )}
        </Box>
    )
}

const getButtonLabel = (status: SignupButtonStatus) => {
    switch (status) {
        default:
            return 'Connect wallet'
        case SignupButtonStatus.FetchingRegistrationStatus:
            return 'Connecting to server'
        case SignupButtonStatus.ConnectUnlock:
        case SignupButtonStatus.WalletBusy:
            return 'Waiting for wallet'
        case SignupButtonStatus.ConnectRequired:
        case SignupButtonStatus.ConnectError:
            return 'Connect wallet'
        case SignupButtonStatus.Login:
            return 'Login'
        case SignupButtonStatus.Register:
            return 'Register'
    }
}

const getErrorMessage = (status: SignupButtonStatus): string | null => {
    switch (status) {
        case SignupButtonStatus.ConnectError:
            return 'Something went wrong, please make sure your wallet is unlocked'
        default:
            return null
    }
}

export default LoginComponent
