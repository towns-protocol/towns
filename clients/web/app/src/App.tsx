import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useCallback, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'
import { InitialSyncSortPredicate, SpaceProtocol, ZionContextProvider } from 'use-zion-client'
import { Helmet } from 'react-helmet'

import { Notifications } from '@components/Notifications/Notifications'
import { AnalyticsProvider } from 'hooks/useAnalytics'
import { useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useWindowListener } from 'hooks/useWindowListener'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { Figma } from 'ui/styles/palette'
import { AppBadge, FaviconBadge } from '@components/AppBadges/AppBadges'
import { AppNotifications } from '@components/AppNotifications/AppNotifications'
import { useStore } from 'store/store'
import { RegisterPushSubscription } from '@components/RegisterPushSubscription/RegisterPushSubscription'
import { AllRoutes } from 'AllRoutes'
import { wagmiConfig } from 'wagmiConfig'

const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

// evan aug 2023, remove this after a couple months
// https://linear.app/hnt-labs/issue/HNT-1876/remove-the-indexeddb-deletion-code-after-some-time
try {
    // towns/mute-settings - not needed anymore
    const DBDeleteRequest = window.indexedDB.deleteDatabase('towns/mute-settings')
    DBDeleteRequest.onerror = (event) => {
        console.error('[DBDeleteRequest] Error deleting database', event)
    }
} catch (error) {
    console.error('[DBDeleteRequest] indexedDB error', error)
}

export const App = () => {
    const { theme } = useStore((state) => ({
        theme: state.theme,
    }))

    useWindowListener()

    // aellis april 2023, the two server urls and the chain id should all be considered
    // a single piece of state, PROD, TEST, and LOCAL each should have {matrixUrl, casablancaUrl, chainId}
    const environment = useEnvironment()
    const { isTouch } = useDevice()
    const location = useLocation()
    const routeOnLoad = useRef(location.pathname)
    const initalSyncSortPredicate: InitialSyncSortPredicate = useCallback((a, b) => {
        const bookmark = useStore.getState().spaceIdBookmark
        // if directly navigating to a space, prioritize it
        if (routeOnLoad.current.includes(a.slug)) {
            return -1
        }
        // if there's a bookmark, prioritize it, as long as there's not also a direct navigation
        if (bookmark === a.slug && !routeOnLoad.current.includes(b.slug)) {
            return -1
        }
        return 1
    }, [])

    const timeBetweenSyncingSpaces = useMemo(() => (isTouch ? 2_000 : 0), [isTouch])
    console.log('smart contract version', environment.smartContractVersion)

    return (
        <ZionContextProvider
            primaryProtocol={env.VITE_PRIMARY_PROTOCOL as SpaceProtocol}
            casablancaServerUrl={environment.casablancaUrl}
            matrixServerUrl={environment.matrixUrl}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={20}
            chainId={environment.chainId}
            initalSyncSortPredicate={initalSyncSortPredicate}
            timeBetweenSyncingSpaces={timeBetweenSyncingSpaces}
            pushNotificationAuthToken={env.VITE_AUTH_WORKER_HEADER_SECRET}
            pushNotificationWorkerUrl={env.VITE_WEB_PUSH_WORKER_URL}
            smartContractVersion={'v3' /*env.VITE_SMART_CONTRACT_VERSION*/}
            wagmiConfig={wagmiConfig}
        >
            <>
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
                <AnalyticsProvider>
                    <>
                        {env.IS_DEV && !env.VITE_DISABLE_DEBUG_BARS && (
                            <DebugBar {...environment} />
                        )}
                    </>
                    <AllRoutes />
                </AnalyticsProvider>
                {!env.VITE_DISABLE_DEBUG_BARS && (
                    <ReactQueryDevtools position="bottom-right" initialIsOpen={false} />
                )}
                <Notifications />
                <ReloadPrompt />
            </>
        </ZionContextProvider>
    )
}

export default App
