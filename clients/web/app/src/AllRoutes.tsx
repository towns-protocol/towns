import React, { Suspense } from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useZionContext } from 'use-zion-client'
import { SentryReportModal } from '@components/SentryErrorReport/SentryErrorReport'
import { Box, Stack } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { Register } from 'routes/Register'
import { WelcomeRoute } from 'routes/Welcome'
import { mobileAppClass } from 'ui/styles/globals/utils.css'
import { LoadingScreen } from 'routes/LoadingScreen'
import { PublicTownPage } from 'routes/PublicTownPage'

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))
const VersionsPage = React.lazy(() => import('routes/VersionsPage'))

const PlaygroundRoutes = React.lazy(() => import('@components/Playground/PlaygroundRoutes'))

export const AllRoutes = () => {
    const { isAuthenticatedAndConnected } = useAuth()

    return (
        <>
            {!isAuthenticatedAndConnected && (
                <Box position="fixed" left="lg" bottom="lg">
                    <SentryReportModal />
                </Box>
            )}
            <Routes>
                <Route element={<ResponsiveOutlet />}>
                    {/* TODO: Remove extra level */}
                    <Route element={<Outlet />}>
                        <>
                            <Route path={PATHS.VERSIONS} element={<VersionsPage />} />
                            {!isAuthenticatedAndConnected ? (
                                <>
                                    <Route path={PATHS.REGISTER} element={<WelcomeRoute />} />
                                    <Route path={PATHS.LOGIN} element={<WelcomeRoute />} />
                                    <Route
                                        path={`${PATHS.SPACES}/:spaceSlug/*`}
                                        element={<PublicTownPage />}
                                    />
                                    <Route
                                        path="*"
                                        element={<RedirectToLoginWithSavedLocation />}
                                    />
                                </>
                            ) : (
                                <>
                                    <Route path="*" element={<AuthenticatedOrRegister />}>
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

export const AuthenticatedOrRegister = () => {
    const needsOnboarding = useNeedsOnboarding()
    return needsOnboarding ? (
        <Register />
    ) : (
        <Suspense fallback={<LoadingScreen />}>
            <Outlet />
        </Suspense>
    )
}

const RedirectToLoginWithSavedLocation = () => (
    <Navigate replace to={PATHS.LOGIN} state={{ redirectTo: window.location.pathname }} />
)

const ResponsiveOutlet = () => {
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

function useNeedsOnboarding(): boolean {
    const { matrixOnboardingState } = useZionContext()
    switch (matrixOnboardingState.kind) {
        case 'update-profile':
            return matrixOnboardingState.bNeedsDisplayName
        default:
            return false
    }
}
