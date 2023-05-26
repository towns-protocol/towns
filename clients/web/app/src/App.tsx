import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useRef } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { SpaceProtocol, ZionContextProvider } from 'use-zion-client'
import { Helmet } from 'react-helmet'
import { Notifications } from '@components/Notifications/Notifications'
import { PlaygroundRoutes } from '@components/Playground/PlaygroundRoutes'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { Box, Stack } from '@ui'
import { AnalyticsProvider } from 'hooks/useAnalytics'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
import { useRootTheme } from 'hooks/useRootTheme'
import { useWindowListener } from 'hooks/useWindowListener'
import { PATHS } from 'routes'
import { LoadingScreen } from 'routes/LoadingScreen'
import { Register } from 'routes/Register'
import { Welcome } from 'routes/Welcome'
import { AppLayout } from 'routes/layouts/AppLayout'
import { mobileAppClass } from 'ui/styles/globals/utils.css'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { Figma } from 'ui/styles/palette'

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))
const InviteLinkLanding = React.lazy(() => import('routes/InviteLinkLanding'))
const VersionsPage = React.lazy(() => import('routes/VersionsPage'))

const Playground = React.lazy(() => import('@components/Playground'))
const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

export const App = () => {
    const { theme } = useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: true,
    })

    // aellis april 2023, the two server urls and the chain id should all be considered
    // a single piece of state, PROD, TEST, and LOCAL each should have {matrixUrl, casablancaUrl, chainId}
    const environment = useEnvironment()

    return (
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
                <Helmet>
                    <meta
                        name="theme-color"
                        content={
                            theme === 'dark'
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
