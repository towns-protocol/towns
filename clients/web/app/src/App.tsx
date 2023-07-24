import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useCallback, useMemo, useRef } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router'
import { InitialSyncSortPredicate, SpaceProtocol, ZionContextProvider } from 'use-zion-client'
import { Helmet } from 'react-helmet'
import { getDefaultWallets } from '@rainbow-me/rainbowkit'
import { Chain } from 'wagmi'
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
import { Notifications } from '@components/Notifications/Notifications'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { Box, Stack } from '@ui'
import { AnalyticsProvider } from 'hooks/useAnalytics'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useWindowListener } from 'hooks/useWindowListener'
import { PATHS } from 'routes'
import { Register } from 'routes/Register'
import { WelcomeRoute } from 'routes/Welcome'
import { AppLayout } from 'routes/layouts/AppLayout'
import { mobileAppClass } from 'ui/styles/globals/utils.css'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { Figma } from 'ui/styles/palette'
import { AppBadge, FaviconBadge } from '@components/AppBadges/AppBadges'
import { AppNotifications } from '@components/AppNotifications/AppNotifications'
import { useStore } from 'store/store'
import { shouldUseWalletConnect } from 'hooks/useShouldUseWalletConnect'

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))
const InviteLinkLanding = React.lazy(() => import('routes/InviteLinkLanding'))
const VersionsPage = React.lazy(() => import('routes/VersionsPage'))

const PlaygroundRoutes = React.lazy(() => import('@components/Playground/PlaygroundRoutes'))
const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

const walletConnectors = ({ chains }: { chains: Chain[] }) => {
    const { connectors: rainbowKitConnectors } = getDefaultWallets({
        appName: 'Towns',
        chains,
        projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
    })

    return shouldUseWalletConnect()
        ? [
              new WalletConnectConnector({
                  chains,
                  options: {
                      projectId: env.VITE_WALLET_CONNECT_PROJECT_ID,
                      metadata: {
                          name: 'Towns',
                          url: 'https://towns.com',
                          description: 'Towns',
                          icons: [],
                      },
                  },
              }),
          ]
        : rainbowKitConnectors()
}

export const App = () => {
    const { theme } = useStore((state) => ({
        theme: state.theme,
    }))

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

    return (
        <ZionContextProvider
            alchemyKey={env.VITE_ALCHEMY_API_KEY}
            primaryProtocol={env.VITE_PRIMARY_PROTOCOL as SpaceProtocol}
            casablancaServerUrl={environment.casablancaUrl}
            matrixServerUrl={environment.matrixUrl}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={20}
            connectors={walletConnectors}
            chainId={environment.chainId}
            initalSyncSortPredicate={initalSyncSortPredicate}
            timeBetweenSyncingSpaces={timeBetweenSyncingSpaces}
            pushNotificationAuthToken={env.VITE_AUTH_WORKER_HEADER_SECRET}
            pushNotificationWorkerUrl={env.VITE_WEB_PUSH_WORKER_URL}
        >
            <>
                <FaviconBadge />
                <AppBadge />
                <AppNotifications />
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
                    <>{env.IS_DEV && <DebugBar {...environment} />}</>
                    <AllRoutes />
                </AnalyticsProvider>
                <ReactQueryDevtools position="bottom-right" initialIsOpen={false} />
                <Notifications />
                <ReloadPrompt />
            </>
        </ZionContextProvider>
    )
}

const AllRoutes = () => {
    const { isAuthenticatedAndConnected } = useAuth()

    useWindowListener()
    return (
        <>
            {!isAuthenticatedAndConnected && (
                <Box position="fixed" left="lg" bottom="lg">
                    <SentryReportModal />
                </Box>
            )}
            <Routes>
                <Route element={<AppTopLevelLayout />}>
                    <Route element={<Outlet />}>
                        <>
                            <Route path={PATHS.VERSIONS} element={<VersionsPage />} />
                            {!isAuthenticatedAndConnected && (
                                <>
                                    <Route path={PATHS.REGISTER} element={<WelcomeRoute />} />
                                    <Route path={PATHS.LOGIN} element={<WelcomeRoute />} />
                                    <Route
                                        path={`${PATHS.SPACES}/:spaceSlug`}
                                        element={<InviteLinkLanding />}
                                    />

                                    <Route
                                        path="*"
                                        element={<RedirectToLoginWithSavedLocation />}
                                    />
                                </>
                            )}

                            {isAuthenticatedAndConnected && (
                                <>
                                    <Route
                                        path={`/${PATHS.PREFERENCES}`}
                                        element={<Register isEdit />}
                                    />
                                    <Route path="*" element={<AppLayout />}>
                                        <Route path="*" element={<AuthenticatedRoutes />} />
                                    </Route>
                                </>
                            )}
                        </>
                    </Route>

                    <Route path="/playground/*" element={<PlaygroundRoutes />} />
                </Route>
            </Routes>
        </>
    )
}

const RedirectToLoginWithSavedLocation = () => (
    <Navigate replace to={PATHS.LOGIN} state={{ redirectTo: window.location.pathname }} />
)

const AppTopLevelLayout = () => {
    const { isTouch } = useDevice()

    return isTouch ? (
        <Box className={mobileAppClass}>
            <Outlet />
        </Box>
    ) : (
        <Stack grow color="default" minHeight="100vh">
            <Outlet />
        </Stack>
    )
}

export default App
