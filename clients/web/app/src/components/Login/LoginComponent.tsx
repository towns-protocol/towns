import React, { useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { useWeb3Context } from 'use-zion-client'
import { useAuth } from 'hooks/useAuth'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { Box, Icon, Stack, Text } from '@ui'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { FadeIn } from '@components/Transitions'
import { useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useAddSepoliaToWallet } from 'hooks/useAddSepoliaToWallet'
import { shouldUseWalletConnect } from 'hooks/useShouldUseWalletConnect'
import { LoginButton } from './LoginButton/LoginButton'
import { WalletConnectButton } from './WalletConnectButton'
import { RainbowKitLoginButton } from './RainbowKitLoginButton'

export const LoginComponent = () => {
    const { chains } = useWeb3Context()
    const { shouldDisplaySepoliaPrompt, addSepoliaToWallet } = useAddSepoliaToWallet()

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
        userOnWrongNetworkForSignIn,
        isConnected,
    } = useAuth()

    const { switchNetwork } = useRequireTransactionNetwork()
    const { chainName } = useEnvironment()

    useEffect(() => {
        console.log('LoginComponent wagmi info:', {
            activeWalletAddress,
            loggedInWalletAddress,
            walletStatus,
            error: connectError,
            pendingConnector,
            loginError,
        })
    }, [
        activeWalletAddress,
        connectError,
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

    const { isTouch } = useDevice()

    const loginButtonContent = () => {
        // on mobile devices, if they aren't on the right network, don't show the login button - they have to go to the wallet and switch, then come back to the app
        if (isConnected) {
            if (isTouch && userOnWrongNetworkForSignIn) {
                return null
            }
            return (
                <LoginButton
                    isConnected={isConnected}
                    userOnWrongNetworkForSignIn={userOnWrongNetworkForSignIn}
                    label={buttonLabel}
                    loading={isSpinning}
                    icon="wallet"
                    onClick={onButtonClick}
                />
            )
        }
        return null
    }

    return (
        <RainbowKitProvider chains={chains}>
            <Box centerContent gap="md">
                {isConnected && isTouch && userOnWrongNetworkForSignIn && (
                    <Box
                        gap
                        rounded="sm"
                        flexDirection="row"
                        justifyContent="end"
                        padding="md"
                        background="level2"
                        maxWidth="300"
                    >
                        <Icon type="alert" color="error" />
                        <Text>{`Please switch to ${chainName} in your wallet, and then come back to continue.`}</Text>
                    </Box>
                )}
                <Stack gap>
                    {loginButtonContent()}

                    {shouldUseWalletConnect() ? (
                        <WalletConnectButton isConnected={isConnected} />
                    ) : (
                        <RainbowKitLoginButton isConnected={isConnected} />
                    )}
                </Stack>

                {isConnected && userOnWrongNetworkForSignIn && !isTouch && (
                    <Box paddingTop="md" flexDirection="row" justifyContent="end">
                        <RequireTransactionNetworkMessage
                            postCta="to sign in."
                            switchNetwork={switchNetwork}
                        />
                    </Box>
                )}

                {shouldDisplaySepoliaPrompt && (
                    <Box
                        display="inline"
                        as="span"
                        cursor="pointer"
                        fontSize="sm"
                        color="cta1"
                        onClick={addSepoliaToWallet}
                    >
                        Click here to add the Sepolia network to your wallet
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
        </RainbowKitProvider>
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
