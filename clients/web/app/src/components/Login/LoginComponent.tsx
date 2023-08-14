import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { useWeb3Context } from 'use-zion-client'
import { ThemeOptions } from '@rainbow-me/rainbowkit/dist/themes/baseTheme'
import { useAuth } from 'hooks/useAuth'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { Box, FancyButton, Icon, Paragraph, Text } from '@ui'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useAddSepoliaToWallet } from 'hooks/useAddSepoliaToWallet'
import { shouldUseWalletConnect } from 'hooks/useShouldUseWalletConnect'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { useDebounce } from 'hooks/useDebounce'
import { shortAddress } from 'ui/utils/utils'
import { atoms } from 'ui/styles/atoms.css'
import { WalletConnectButton } from './WalletConnectButton'
import { RainbowKitLoginButton } from './RainbowKitLoginButton'
import {
    Props as RequireTransactionModalProps,
    RequireTransactionNetworkModal,
} from './RequireTransactionNetworkModal'

export const LoginComponent = () => {
    const { theme } = useStore((state) => ({
        theme: state.theme,
    }))
    const { chains } = useWeb3Context()

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
        onClick: onLoginClick,
        isSpinning,
    } = useSignupButton({
        walletStatus,
        loginStatus,
        connect,
        register,
        login,
    })

    const errorMessage = loginError ? loginError.message : getErrorMessage(status)

    const rainbowTheme = useMemo(() => {
        const customTheme: ThemeOptions = {
            fontStack: 'system',
            accentColor: Figma.Colors.Blue,
            borderRadius: 'medium',
        }
        return theme === 'dark' ? darkTheme(customTheme) : lightTheme(customTheme)
    }, [theme])

    return (
        <RainbowKitProvider chains={chains} theme={rainbowTheme}>
            <Box centerContent gap="lg">
                {!isConnected && (
                    <FadeIn delay>
                        <Text>Connect your wallet to continue</Text>
                    </FadeIn>
                )}

                {isConnected ? (
                    <ConnectedState
                        status={status}
                        isSpinning={isSpinning}
                        userOnWrongNetworkForSignIn={userOnWrongNetworkForSignIn}
                        onLoginClick={onLoginClick}
                    />
                ) : (
                    <DisconnectedState />
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

const DisconnectedState = () => {
    return shouldUseWalletConnect() ? <WalletConnectButton /> : <RainbowKitLoginButton />
}

const ConnectedState = (props: {
    status: SignupButtonStatus
    onLoginClick: () => void
    isSpinning: boolean
    userOnWrongNetworkForSignIn: boolean
}) => {
    const buttonLabel = useDebounce(getButtonLabel(props.status), 500)
    const { switchNetwork } = useRequireTransactionNetwork()
    const { shouldDisplaySepoliaPrompt, addSepoliaToWallet } = useAddSepoliaToWallet()

    const isWalletConnectWithMetaMask = shouldUseWalletConnect()
        ? JSON.parse(
              localStorage.getItem('WALLETCONNECT_DEEPLINK_CHOICE') ?? '{}',
          )?.name?.toLowerCase() === 'metamask'
        : false

    return (
        <>
            {/* Metamask + WC is just busted and we can't ensure that the user is on the right network so we have to show more info */}
            {isWalletConnectWithMetaMask ? (
                <>
                    <MobileMetaMaskFlow
                        buttonLabel={buttonLabel}
                        userOnWrongNetworkForSignIn={props.userOnWrongNetworkForSignIn}
                        isSpinning={props.isSpinning}
                        status={props.status}
                        onLoginClick={props.onLoginClick}
                    />
                </>
            ) : (
                <>
                    <FancyButton
                        cta
                        spinner={props.isSpinning}
                        icon="wallet"
                        disabled={props.isSpinning || props.userOnWrongNetworkForSignIn}
                        onClick={props.onLoginClick}
                    >
                        {buttonLabel ?? 'Login'}
                    </FancyButton>
                    {props.userOnWrongNetworkForSignIn && (
                        <Box paddingTop="md" flexDirection="row" justifyContent="end">
                            <RequireTransactionNetworkMessage
                                postCta="to sign in."
                                switchNetwork={switchNetwork}
                            />
                        </Box>
                    )}
                </>
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

            <DisconnectButton />
        </>
    )
}

const MobileMetaMaskFlow = (
    props: {
        buttonLabel: string
        userOnWrongNetworkForSignIn: boolean
    } & Omit<RequireTransactionModalProps, 'onHide'>,
) => {
    const [showMetaMaskWarning, setShowMetaMaskWarning] = useState(false)
    const { userOnWrongNetworkForSignIn, buttonLabel, ...modalProps } = props

    const { chainName } = useEnvironment()
    return (
        <>
            {/* 
            wrong network on MM, can't switch network programatically YET - this should be fixed in Metamask Mobile 7.4.0, but who knows
            https://github.com/MetaMask/metamask-mobile/issues/6655
            in this case, just show them a message that they need to go switch networks themselves
            Note that since WalletConnect doesn't really know what network MM is actually on except for right after you first connect, and that only happens sometimes, this message maybe won't show often, even if it should
            */}
            {userOnWrongNetworkForSignIn && (
                <Box
                    gap
                    rounded="sm"
                    flexDirection="row"
                    justifyContent="end"
                    padding="md"
                    background="level2"
                    maxWidth="300"
                >
                    <Icon type="alert" color="error" size="square_sm" />
                    <Text size="sm">{`Please switch to ${chainName} in your wallet, and then come back to continue.`}</Text>
                </Box>
            )}
            {/* 
                Since the above message isn't going to show up reliably, we take the user to additional check
            */}
            <FancyButton cta icon="wallet" onClick={() => setShowMetaMaskWarning(true)}>
                {buttonLabel ?? 'Login'}
            </FancyButton>

            {showMetaMaskWarning && (
                <RequireTransactionNetworkModal
                    {...modalProps}
                    onHide={() => setShowMetaMaskWarning(false)}
                />
            )}
        </>
    )
}

const DisconnectButton = () => {
    const { disconnect, activeWalletAddress } = useAuth()
    const onClick = useCallback(() => {
        disconnect()
    }, [disconnect])

    return (
        <FadeInBox
            hoverable
            background="level1"
            rounded="xs"
            layout="position"
            cursor="pointer"
            padding="sm"
            onClick={onClick}
        >
            <Paragraph color="gray1" size="sm">
                <span className={atoms({ color: 'cta1' })}>Disconnect Wallet</span>
                {activeWalletAddress ? ` (${shortAddress(activeWalletAddress)})` : ``}
            </Paragraph>
        </FadeInBox>
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
