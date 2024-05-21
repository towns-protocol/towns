import React, { useCallback, useEffect, useMemo } from 'react'
import { LoginStatus, useConnectivity } from 'use-towns-client'
import { usePrivy } from '@privy-io/react-auth'
import { useLocation } from 'react-router'
import { useSearchParams } from 'react-router-dom'
import { useCombinedAuth } from 'privy/useCombinedAuth'
import { Box, FancyButton } from '@ui'
import { useErrorToast } from 'hooks/useErrorToast'
import { mapToErrorMessage } from '@components/Web3/utils'
import { useStore } from 'store/store'
import { useAnalytics } from 'hooks/useAnalytics'
import { LINKED_RESOURCE } from '../../data/rel'

type LoginComponentProps = {
    text?: string
    loggingInText?: string
    onLoginClick?: () => void
}

function LoginComponent({
    text = 'Login',
    loggingInText = 'Logging In...',
    onLoginClick: onLoginClick,
}: LoginComponentProps) {
    const { ready: privyReady } = usePrivy()
    const { login, isAutoLoggingInToRiver } = useCombinedAuth()
    const { loginError, loginStatus: libLoginStatus } = useConnectivity()

    const errorMessage = loginError ? mapToErrorMessage(loginError) : undefined

    const isBusy = libLoginStatus === LoginStatus.LoggingIn || isAutoLoggingInToRiver

    const location = useLocation()
    const [searchParams] = useSearchParams()
    const state = useStore.getState()
    const spaceIdBookmark = state.spaceIdBookmark
    const channelBookmark = spaceIdBookmark ? state.townRouteBookmarks[spaceIdBookmark] : undefined
    const { analytics } = useAnalytics()

    const rel = useMemo(() => {
        return searchParams.get(LINKED_RESOURCE) ?? ''
    }, [searchParams])

    useEffect(() => {
        // Reminder to remove: https://linear.app/hnt-labs/issue/HNT-6068/remove-consolewarn-from-the-harmony-app-after-verifying-hnt-5685-is
        console.warn('[LoginComponent][hnt-5685]', 'route', {
            rel,
            locationPath: location.pathname,
            locationParams: location.search,
            spaceIdBookmark,
            channelBookmark,
            libLoginStatus,
            privyReady,
            isAutoLoggingInToRiver,
        })
    }, [
        channelBookmark,
        isAutoLoggingInToRiver,
        libLoginStatus,
        location.pathname,
        location.search,
        privyReady,
        spaceIdBookmark,
        rel,
    ])

    const loginContent = () => {
        if (isAutoLoggingInToRiver) {
            return loggingInText
        }
        // on app load user starts in a logging in state.
        // The goal is to never show this button in that state.
        // but in case this component appears, just let the spinner show
        if (LoginStatus.LoggingIn === libLoginStatus) {
            return ''
        }
        return text
    }

    const onButtonClick = useCallback(async () => {
        if (!privyReady || isBusy) {
            return
        }
        if (!onLoginClick) {
            analytics?.track('clicked login', {}, () => {
                console.log('[analytics][LoginComponent] clicked login')
            })
        }
        await onLoginClick?.()
        await login()
    }, [privyReady, isBusy, onLoginClick, login, analytics])

    useErrorToast({
        errorMessage,
        contextMessage: 'There was an error logging in, please try again.',
    })

    if (LoginStatus.LoggingIn === libLoginStatus) {
        return <></>
    }

    return (
        <Box centerContent gap="lg">
            <Box width="100%">
                <FancyButton
                    cta
                    disabled={!privyReady || isBusy}
                    spinner={isBusy}
                    onClick={onButtonClick}
                >
                    {loginContent()}
                </FancyButton>
            </Box>
        </Box>
    )
}

export default LoginComponent
