import React, { useRef } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { SpaceProtocol, ZionContextProvider } from 'use-zion-client'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { PlaygroundRoutes } from '@components/Playground/PlaygroundRoutes'
import { Box, Stack } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useWindowListener } from 'hooks/useWindowListener'
import { PATHS } from 'routes'
import { Register } from 'routes/Register'
import { Welcome } from 'routes/Welcome'
import { AppPanelLayout } from 'routes/layouts/AppPanelLayout'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { HomeServerUrl, useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'
import { LoadingScreen } from 'routes/LoadingScreen'
import { AnalyticsProvider } from 'hooks/useAnalytics'
import { useCorrectChainForServer } from 'hooks/useCorrectChainForServer'
import { useDevice } from 'hooks/useDevice'
import { MobileView } from 'routes/MobileView'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { Notifications } from '@components/Notifications/Notifications'

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))
const InviteLinkLanding = React.lazy(() => import('routes/InviteLinkLanding'))
const VersionsPage = React.lazy(() => import('routes/VersionsPage'))

const Playground = React.lazy(() => import('@components/Playground'))
const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

const CASABLANCA_SERVER_URL = env.VITE_CASABLANCA_SERVER_URL ?? ''

export const App = () => {
    // aellis april 2023, the two server urls and the chain id should all be considered
    // a single piece of state, PROD, TEST, and LOCAL each should have {matrixUrl, casablancaUrl, chainId}
    const { homeserverUrl, ...rest } = useMatrixHomeServerUrl()
    const casablancaServerUrl = homeserverUrl === HomeServerUrl.LOCAL ? CASABLANCA_SERVER_URL : ''
    const chain = useCorrectChainForServer()
    const { isMobile } = useDevice()

    return !isMobile ? (
        <ZionContextProvider
            alchemyKey={env.VITE_ALCHEMY_API_KEY}
            primaryProtocol={SpaceProtocol.Matrix}
            casablancaServerUrl={casablancaServerUrl}
            matrixServerUrl={homeserverUrl}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={100}
            chainId={chain.id}
        >
            <>
                <AnalyticsProvider>
                    <>{env.IS_DEV && <DebugBar homeserverUrl={homeserverUrl} {...rest} />}</>
                    <AllRoutes />
                </AnalyticsProvider>
                <ReactQueryDevtools position="bottom-right" initialIsOpen={false} />
                <Notifications />
            </>
        </ZionContextProvider>
    ) : (
        <Routes>
            <Route element={<AppLayout />}>
                <Route path="*" element={<MobileView />} />
            </Route>
        </Routes>
    )
}

const AllRoutes = () => {
    const { isAuthenticatedAndConnected, connectLoading } = useAuth()
    const connectedOnce = useRef(false)

    useWindowListener()

    // only show the loading screen on first load, and not if user swaps wallet
    if (connectLoading && !connectedOnce.current) {
        return <LoadingScreen />
    }
    connectedOnce.current = true

    return (
        <>
            {!isAuthenticatedAndConnected && (
                <Box position="fixed" left="lg" bottom="lg">
                    <SentryReportModal />
                </Box>
            )}
            <Routes>
                <Route element={<AppLayout />}>
                    <Route element={<Outlet />}>
                        <>
                            <Route path={PATHS.VERSIONS} element={<VersionsPage />} />
                            {!isAuthenticatedAndConnected && (
                                <>
                                    <Route path={PATHS.REGISTER} element={<Welcome />} />
                                    <Route path={PATHS.LOGIN} element={<Welcome />} />
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
                                    <Route path="*" element={<AppPanelLayout />}>
                                        <Route path="*" element={<AuthenticatedRoutes />} />
                                    </Route>
                                </>
                            )}
                        </>
                    </Route>
                    <Route path="/playground" element={<Playground />} />
                    <Route path="/playground/*" element={<PlaygroundRoutes />} />
                </Route>
            </Routes>
        </>
    )
}

const RedirectToLoginWithSavedLocation = () => (
    <Navigate replace to={PATHS.LOGIN} state={{ redirectTo: window.location.pathname }} />
)

const AppLayout = () => {
    return (
        <Stack grow color="default" minHeight="100vh">
            <Outlet />
        </Stack>
    )
}

export default App
