import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useCallback, useRef } from 'react'
import { useLocation } from 'react-router'
import { InitialSyncSortPredicate, ZTEvent, ZionContextProvider } from 'use-zion-client'
import { Helmet } from 'react-helmet'

import { EmbeddedSignerContextProvider } from '@towns/privy'
import { Notifications } from '@components/Notifications/Notifications'
import { useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useWindowListener } from 'hooks/useWindowListener'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { Figma } from 'ui/styles/palette'
import { AppBadge, FaviconBadge } from '@components/AppBadges/AppBadges'
import { AppNotifications } from '@components/AppNotifications/AppNotifications'
import { useStore } from 'store/store'
import { RegisterPushSubscription } from '@components/RegisterPushSubscription/RegisterPushSubscription'
import { AllRoutes } from 'AllRoutes'
import { ServiceWorkerSpacesSyncer } from 'workers/ServiceWorkerSpaceSyncer'
import { AuthContextProvider } from 'hooks/useAuth'
import { useWatchForPrivyRequestErrors } from 'hooks/useWatchForPrivyRequestErrors'
import DebugBar from '@components/DebugBar/DebugBar'
import { BetaDebugger } from './BetaDebugger'

FontLoader.init()

export const App = () => {
    const { theme } = useStore((state) => ({
        theme: state.theme,
    }))

    useWindowListener()
    useWatchForPrivyRequestErrors()

    // aellis april 2023, the two server urls and the chain id should all be considered
    // a single piece of state, PROD, TEST, and LOCAL each should have {matrixUrl, casablancaUrl, chainId}
    const environment = useEnvironment()
    const { isTouch } = useDevice()
    const location = useLocation()
    const routeOnLoad = useRef(location.pathname)
    const initalSyncSortPredicate: InitialSyncSortPredicate = useCallback((a, b) => {
        const bookmark = useStore.getState().spaceIdBookmark
        // if directly navigating to a space, prioritize it
        if (routeOnLoad.current.includes(a)) {
            return -1
        }
        // if there's a bookmark, prioritize it, as long as there's not also a direct navigation
        if (bookmark === a && !routeOnLoad.current.includes(b)) {
            return -1
        }
        return 1
    }, [])

    return (
        <ZionContextProvider
            casablancaServerUrl={environment.casablancaUrl}
            chainId={environment.chainId}
            initalSyncSortPredicate={initalSyncSortPredicate}
            timelineFilter={new Set([ZTEvent.Fulfillment, ZTEvent.KeySolicitation])}
        >
            <EmbeddedSignerContextProvider chainId={environment.chainId}>
                <BetaDebugger />
                <AuthContextProvider>
                    <FaviconBadge />
                    <AppBadge />
                    <AppNotifications />
                    <RegisterPushSubscription />
                    <Helmet>
                        <meta
                            name="theme-color"
                            content={
                                isTouch
                                    ? theme === 'dark'
                                        ? Figma.DarkMode.Level1
                                        : Figma.LightMode.Level1
                                    : theme === 'dark'
                                    ? Figma.DarkMode.Readability
                                    : Figma.LightMode.Readability
                            }
                        />
                    </Helmet>
                    <>
                        {env.DEV && !env.VITE_DISABLE_DEBUG_BARS && <DebugBar {...environment} />}
                        <AllRoutes />
                    </>
                    {!env.VITE_DISABLE_DEBUG_BARS && (
                        <ReactQueryDevtools position="bottom-right" initialIsOpen={false} />
                    )}
                    <Notifications />
                    <ServiceWorkerSpacesSyncer />
                </AuthContextProvider>
            </EmbeddedSignerContextProvider>
        </ZionContextProvider>
    )
}

export default App
