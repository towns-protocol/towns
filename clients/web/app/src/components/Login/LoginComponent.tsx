import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from 'hooks/useAuth'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { Box, Stack, Text } from '@ui'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { FadeIn } from '@components/Transitions'
import { LoginButton } from './LoginButton/LoginButton'
import { RainbowKitLoginButton } from './RainbowKitLoginButton'
import '@rainbow-me/rainbowkit/styles.css'

export const LoginComponent = () => {
    const {
        activeWalletAddress,
        loggedInWalletAddress,
        loginStatus,
        loginError,
        login,
        register,
        walletStatus,
        connect,
        pendingConnector,
        connectError,
        connectLoading,
        userOnWrongNetworkForSignIn,
        isConnected,
    } = useAuth()

    const { switchNetwork } = useRequireTransactionNetwork()

    useEffect(() => {
        console.log('LoginComponent wagmi info:', {
            activeWalletAddress,
            loggedInWalletAddress,
            walletStatus,
            error: connectError,
            isLoading: connectLoading,
            pendingConnector,
            loginError,
        })
    }, [
        activeWalletAddress,
        connectError,
        connectLoading,
        loggedInWalletAddress,
        loginError,
        pendingConnector,
        walletStatus,
    ])

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
            <Stack gap>
                {isConnected && (
                    <LoginButton
                        isConnected={isConnected}
                        userOnWrongNetworkForSignIn={userOnWrongNetworkForSignIn}
                        label={buttonLabel}
                        loading={isSpinning}
                        icon="wallet"
                        onClick={onButtonClick}
                    />
                )}
                <RainbowKitLoginButton isConnected={isConnected} />
            </Stack>

            {isConnected && userOnWrongNetworkForSignIn && (
                <Box paddingTop="md" flexDirection="row" justifyContent="end">
                    <RequireTransactionNetworkMessage
                        postCta="to sign in."
                        switchNetwork={switchNetwork}
                    />
                </Box>
            )}

            <AnimatePresence>
                {errorMessage && (
                    <FadeIn>
                        <Text color="negative" size="sm">
                            {errorMessage}
                        </Text>
                    </FadeIn>
                )}
            </AnimatePresence>
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
