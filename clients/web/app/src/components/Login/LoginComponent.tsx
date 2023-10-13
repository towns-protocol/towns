import React, { useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { RainbowKitProvider, darkTheme, lightTheme } from '@rainbow-me/rainbowkit'
import { useWeb3Context } from 'use-zion-client'
import { ThemeOptions } from '@rainbow-me/rainbowkit/dist/themes/baseTheme'
import { useAuth } from 'hooks/useAuth'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { Box, FancyButton, Paragraph, Text } from '@ui'
import { RequireTransactionNetworkMessage } from '@components/RequireTransactionNetworkMessage/RequireTransactionNetworkMessage'
import { useRequireTransactionNetwork } from 'hooks/useRequireTransactionNetwork'
import { FadeIn, FadeInBox } from '@components/Transitions'
import { useAddSepoliaToWallet } from 'hooks/useAddSepoliaToWallet'
import { shouldUseWalletConnect } from 'hooks/useShouldUseWalletConnect'
import { useStore } from 'store/store'
import { Figma } from 'ui/styles/palette'
import { useDebounce } from 'hooks/useDebounce'
import { shortAddress } from 'ui/utils/utils'
import { atoms } from 'ui/styles/atoms.css'
import { isTouch } from 'hooks/useDevice'
import { useWalletConnectProvider } from 'hooks/useWalletConnectProvider'
import { WalletConnectButton } from './WalletConnectButton'
import { RainbowKitLoginButton, RainbowKitLoginPublicButton } from './RainbowKitLoginButton'
import { MobileMetaMaskFlow } from './MobileMetamaskFlow'

type Props = {
    isPublicPage?: boolean
}

export function LoginComponent(props: Props) {
    const { isConnected } = useAuth()

    return (
        <Box centerContent gap="lg">
            {isConnected ? <ConnectedState /> : <DisconnectedState {...props} />}
        </Box>
    )
}

function DisconnectedState(props: Props) {
    const { isPublicPage } = props
    const { chains } = useWeb3Context()

    const { theme } = useStore((state) => ({
        theme: state.theme,
    }))

    const rainbowTheme = useMemo(() => {
        const customTheme: ThemeOptions = {
            fontStack: 'system',
            accentColor: Figma.Colors.Blue,
            borderRadius: 'medium',
        }
        return theme === 'dark' ? darkTheme(customTheme) : lightTheme(customTheme)
    }, [theme])

    return (
        <>
            {!isPublicPage && (
                <FadeIn delay>
                    <Text>Connect your wallet to continue</Text>
                </FadeIn>
            )}
            <Box width="100%">
                <RainbowKitProvider chains={chains} theme={rainbowTheme}>
                    {isPublicPage ? (
                        shouldUseWalletConnect() ? (
                            <WalletConnectButton />
                        ) : (
                            <RainbowKitLoginPublicButton />
                        )
                    ) : (
                        <Box alignSelf="center">
                            {shouldUseWalletConnect() ? (
                                <WalletConnectButton />
                            ) : (
                                <RainbowKitLoginButton />
                            )}
                        </Box>
                    )}
                </RainbowKitProvider>
            </Box>
        </>
    )
}

function ConnectedState() {
    const { login, register, userOnWrongNetworkForSignIn, loginError } = useAuth()

    const {
        status,
        onClick: onLoginClick,
        isSpinning,
    } = useSignupButton({
        register,
        login,
    })
    const errorMessage = loginError ? loginError.message : null

    const buttonLabel = useDebounce(getLoginButtonLabel(status), 500)
    const { switchNetwork } = useRequireTransactionNetwork()
    const { shouldDisplaySepoliaPrompt, addSepoliaToWallet } = useAddSepoliaToWallet()

    const provider = useWalletConnectProvider()
    const isWalletConnectWithMetaMask = useMemo(() => {
        return provider?.session?.peer.metadata.url.includes('metamask')
    }, [provider])

    // 8.18.23
    // On mobile, you can't just ask to switch networks - WC updates it's chainId to match what you want to switch to, but it doesn't change your actual wallet's chainId
    // Instead, when a signature is required, it opens your wallet and prompts you to switch networks then
    // maybe this will change in the future, but for now we just allow them to hit the login button and hope the wallet will ask them to switch
    const requireCorrectNetwork = !isTouch() && userOnWrongNetworkForSignIn

    return (
        <>
            {/*  
            Mobile MetaMask Flow
            8.18.23
            TODO:
            Should other mobile wallets use this flow
            So far, only MetaMask on mobile has this issue */}
            {isWalletConnectWithMetaMask ? (
                <MobileMetaMaskFlow
                    buttonLabel={buttonLabel}
                    userOnWrongNetworkForSignIn={userOnWrongNetworkForSignIn}
                    isSpinning={isSpinning}
                    onLoginClick={onLoginClick}
                />
            ) : (
                <>
                    <FancyButton
                        cta
                        spinner={isSpinning}
                        icon="wallet"
                        disabled={isSpinning || requireCorrectNetwork}
                        onClick={onLoginClick}
                    >
                        {buttonLabel ?? 'Login'}
                    </FancyButton>

                    {requireCorrectNetwork && (
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

            <AnimatePresence>
                {errorMessage && (
                    <FadeIn>
                        <Text color="negative" size="sm">
                            {errorMessage}
                        </Text>
                    </FadeIn>
                )}
            </AnimatePresence>
        </>
    )
}

function DisconnectButton() {
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

const getLoginButtonLabel = (status: SignupButtonStatus) => {
    switch (status) {
        default:
        case SignupButtonStatus.FetchingRegistrationStatus:
            return 'Connecting to server'
        case SignupButtonStatus.Login:
            return 'Login'
        case SignupButtonStatus.Register:
            return 'Register'
    }
}

export default LoginComponent
