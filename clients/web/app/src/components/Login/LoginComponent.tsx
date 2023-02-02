import React, { useEffect } from 'react'
import { useAuth } from 'hooks/useAuth'
import { SignupButtonStatus, useSignupButton } from 'hooks/useSignupButton'
import { LoginButton } from './LoginButton/LoginButton'
import { ButtonTooltip } from './LoginButton/Tooltip/ButtonTooltip'

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
    const tooltipMessage = getTooltipMessage(status)

    return (
        <ButtonTooltip message={loginError ? loginError.message : tooltipMessage}>
            <LoginButton
                tone="cta1"
                label={buttonLabel}
                loading={isSpinning}
                icon="wallet"
                onClick={onButtonClick}
            />
        </ButtonTooltip>
    )
}

const getButtonLabel = (status: SignupButtonStatus) => {
    switch (status) {
        default:
            return 'Connect wallet'
        case SignupButtonStatus.ConnectRequired:
        case SignupButtonStatus.ConnectError:
            return 'Connect wallet'
        case SignupButtonStatus.Login:
        case SignupButtonStatus.LoginProgress:
            return 'Login'
        case SignupButtonStatus.Register:
            return 'Register'
    }
}

const getTooltipMessage = (status: SignupButtonStatus) => {
    switch (status) {
        case SignupButtonStatus.ConnectUnlock:
        case SignupButtonStatus.ConnectUnlockTimeout:
            return 'please unlock your wallet before proceeding'
        case SignupButtonStatus.ConnectRequired:
            return ''
        case SignupButtonStatus.ConnectError:
            return 'something went wrong, please make sure your wallet is unlocked'
        case SignupButtonStatus.Login:
        case SignupButtonStatus.LoginProgress:
            return ''
        case SignupButtonStatus.Register:
            return 'register a new account'
        default:
            return ''
    }
}

export default LoginComponent
