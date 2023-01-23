import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoginStatus, WalletStatus, useZionClient } from 'use-zion-client'
import { useAuth } from './useAuth'

export enum SignupButtonStatus {
    ConnectRequired = 'wallet.connect',
    ConnectError = 'wallet.connect.error',
    ConnectProgress = 'wallet.connect.progress',
    ConnectSuccess = 'wallet.connect.success',
    ConnectUnlock = 'wallet.unlock.unlock',
    ConnectUnlockTimeout = 'wallet.unlock.timeout',
    Login = 'login.required',
    LoginProgress = 'login.progress',
    LoginSuccess = 'login.sucess',
    Register = 'signup.Register',
}

const getIsSpinning = (status: SignupButtonStatus) => {
    return [
        SignupButtonStatus.ConnectUnlock,
        SignupButtonStatus.ConnectUnlockTimeout,
        SignupButtonStatus.ConnectProgress,
        SignupButtonStatus.LoginProgress,
    ].includes(status)
}

const getButtonStatus = (walletStatus: WalletStatus, loginStatus: LoginStatus) => {
    switch (walletStatus) {
        default:
        case WalletStatus.Disconnected: {
            return SignupButtonStatus.ConnectRequired
        }
        case WalletStatus.Connected: {
            if (loginStatus === LoginStatus.LoggingIn) {
                return SignupButtonStatus.LoginProgress
            } else if (loginStatus === LoginStatus.LoggedOut) {
                return SignupButtonStatus.ConnectSuccess
            } else {
                return SignupButtonStatus.LoginSuccess
            }
        }
        case WalletStatus.Connecting: {
            return SignupButtonStatus.ConnectUnlock
        }
        case WalletStatus.Reconnecting: {
            return SignupButtonStatus.ConnectUnlockTimeout
        }
    }
}

const useSignUpButtonClick = (
    status: SignupButtonStatus,
    actions: {
        connect: () => void
        login: () => void
        register: () => void
    },
) => {
    const { connect, login, register } = actions
    return useCallback(() => {
        switch (status) {
            case SignupButtonStatus.ConnectRequired:
            case SignupButtonStatus.ConnectError:
                return connect()
            case SignupButtonStatus.Login:
                return login()
            case SignupButtonStatus.Register:
                return register()
        }
    }, [connect, login, register, status])
}

/**
 * async registration check fired once the wallet is unlocked
 **/
const useCheckRegistrationStatusWhen = (needsCheck: boolean) => {
    const { getIsWalletIdRegistered } = useZionClient()
    const [registrationStatus, setRegistrationStatus] = useState<SignupButtonStatus>()

    useEffect(() => {
        let cancelled = false
        if (!needsCheck) {
            // skip if not in a position to check if the wallet is registered
            setRegistrationStatus(undefined)
        } else {
            // async registration check
            ;(async () => {
                try {
                    const isRegistered = await getIsWalletIdRegistered()
                    if (isRegistered) {
                        setRegistrationStatus(SignupButtonStatus.Login)
                    } else {
                        setRegistrationStatus(SignupButtonStatus.Register)
                    }
                } catch (reason: unknown) {
                    if (!cancelled) {
                        console.warn(reason)
                    }
                }
            })()
        }
        return () => {
            cancelled = true
        }
    }, [getIsWalletIdRegistered, needsCheck])

    return registrationStatus
}

export const useSignupButton = ({
    walletStatus,
    loginStatus,
    connect,
    login,
    register,
}: Pick<ReturnType<typeof useAuth>, 'walletStatus' | 'loginStatus'> & {
    connect: () => void
    login: () => void
    register: () => void
}) => {
    // retrieve the connection and login status synchronously
    const _preliminaryStatus = useMemo(
        () => getButtonStatus(walletStatus, loginStatus),
        [walletStatus, loginStatus],
    )
    // if newly connected but yet not logged in check further (async) if the address is registred
    const registrationStatus = useCheckRegistrationStatusWhen(
        _preliminaryStatus === SignupButtonStatus.ConnectSuccess,
    )
    // actual state of the button based on connection AND registration
    const status = useMemo(
        () => registrationStatus ?? _preliminaryStatus,
        [registrationStatus, _preliminaryStatus],
    )

    const onClick = useSignUpButtonClick(status, {
        connect,
        login,
        register,
    })

    const isSpinning = useMemo(() => getIsSpinning(status), [status])

    return { status, onClick, isSpinning }
}
