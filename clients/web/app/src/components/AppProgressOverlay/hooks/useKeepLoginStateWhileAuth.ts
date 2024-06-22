import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import { AppProgressState } from '../AppProgressState'
import { useAppProgressStore } from '../store/appProgressStore'

export const useKeepLoginStateWhileAuth = () => {
    const { search } = useLocation()
    const hasPrivyOAuthProvider = useMemo(() => search.includes('privy_oauth_provider'), [search])
    const prevState = useRef<AppProgressState | undefined>()
    const appProgressOverlay = useAppProgressStore((state) => state.appProgressOverlay)

    useEffect(() => {
        if (
            hasPrivyOAuthProvider &&
            prevState.current === AppProgressState.LoadingAssets &&
            appProgressOverlay === AppProgressState.None
        ) {
            console.log('[HideContentWhileAuthenticating] setting appProgressOverlay')
            useAppProgressStore.setState({ appProgressOverlay: AppProgressState.LoggingIn })
        }

        prevState.current = appProgressOverlay

        return () => {
            useAppProgressStore.setState((s) =>
                s.appProgressOverlay === AppProgressState.LoggingIn
                    ? { appProgressOverlay: AppProgressState.None }
                    : s,
            )
        }
    }, [appProgressOverlay, hasPrivyOAuthProvider])
}
