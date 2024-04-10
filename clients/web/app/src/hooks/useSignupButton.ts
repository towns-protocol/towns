import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useConnectivity } from 'use-towns-client'

export enum SignupButtonStatus {
    Login = 'login.required',
    Register = 'signup.Register',
    FetchingRegistrationStatus = 'fetching.registration.status',
}

const getIsSpinning = (status: SignupButtonStatus) => {
    return [SignupButtonStatus.FetchingRegistrationStatus].includes(status)
}

const useSignUpButtonClick = (
    status: SignupButtonStatus,
    actions: {
        login: () => void
        register: () => void
    },
) => {
    const { login, register } = actions
    return useCallback(() => {
        switch (status) {
            case SignupButtonStatus.Login:
                return login()
            case SignupButtonStatus.Register:
                return register()
        }
    }, [login, register, status])
}

/**
 * async registration check fired once the wallet is unlocked
 **/
const useCheckRegistrationStatus = () => {
    const { getIsWalletRegistered } = useConnectivity()
    const [registrationStatus, setRegistrationStatus] = useState<SignupButtonStatus>()
    const checkedRef = useRef(false)

    useEffect(() => {
        let cancelled = false
        if (checkedRef.current) {
            return
        }

        // async registration check
        ;(async () => {
            try {
                setRegistrationStatus(SignupButtonStatus.FetchingRegistrationStatus)
                const isRegistered = await getIsWalletRegistered()
                if (isRegistered) {
                    setRegistrationStatus(SignupButtonStatus.Login)
                } else {
                    setRegistrationStatus(SignupButtonStatus.Register)
                }
                checkedRef.current = true
            } catch (reason: unknown) {
                if (!cancelled) {
                    console.warn(reason)
                }
            }
        })()
        return () => {
            cancelled = true
        }
    }, [getIsWalletRegistered])

    return registrationStatus
}

export const useSignupButton = ({
    login,
    register,
}: {
    login: () => void
    register: () => void
}) => {
    const registrationStatus = useCheckRegistrationStatus()
    // actual state of the button based on connection AND registration
    const status = registrationStatus ?? SignupButtonStatus.FetchingRegistrationStatus

    const onClick = useSignUpButtonClick(status, {
        login,
        register,
    })

    const isSpinning = useMemo(() => getIsSpinning(status), [status])
    return { status, onClick, isSpinning }
}
