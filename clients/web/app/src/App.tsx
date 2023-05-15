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
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { LoadingScreen } from 'routes/LoadingScreen'
import { AnalyticsProvider } from 'hooks/useAnalytics'
import { MobileView } from 'routes/MobileView'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { Notifications } from '@components/Notifications/Notifications'
import { useShouldDisplayDesktopOnlyScreen } from 'hooks/useShouldDisplayDesktopOnlyScreen'
import { AppLayout } from 'routes/layouts/AppLayout'
import { useDevice } from 'hooks/useDevice'
import { mobileAppClass } from 'ui/styles/globals/utils.css'

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))
const InviteLinkLanding = React.lazy(() => import('routes/InviteLinkLanding'))
const VersionsPage = React.lazy(() => import('routes/VersionsPage'))

const Playground = React.lazy(() => import('@components/Playground'))
const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

export const App = () => {
    // aellis april 2023, the two server urls and the chain id should all be considered
    // a single piece of state, PROD, TEST, and LOCAL each should have {matrixUrl, casablancaUrl, chainId}
    const environment = useEnvironment()
    const displayDesktopOnlyScreen = useShouldDisplayDesktopOnlyScreen()

    return !displayDesktopOnlyScreen ? (
        <ZionContextProvider
            alchemyKey={env.VITE_ALCHEMY_API_KEY}
            primaryProtocol={SpaceProtocol.Matrix}
            casablancaServerUrl={environment.casablancaUrl}
            matrixServerUrl={environment.matrixUrl}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={100}
            chainId={environment.chainId}
        >
            <>
                <AnalyticsProvider>
                    <>{env.IS_DEV && <DebugBar {...environment} />}</>
                    <AllRoutes />
                </AnalyticsProvider>
                <ReactQueryDevtools position="bottom-right" initialIsOpen={false} />
                <Notifications />
            </>
        </ZionContextProvider>
    ) : (
        <Routes>
            <Route element={<AppTopLevelLayout />}>
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
                <Route element={<AppTopLevelLayout />}>
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
                                    <Route path="*" element={<AppLayout />}>
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

const AppTopLevelLayout = () => {
    const { isMobile } = useDevice()

    return isMobile ? (
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
