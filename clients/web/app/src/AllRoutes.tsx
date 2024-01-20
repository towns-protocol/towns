import React from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { Box, Stack } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { PublicTownPage } from 'routes/PublicTownPage'
import { WelcomeRoute } from 'routes/Welcome'
import { mobileAppClass } from 'ui/styles/globals/utils.css'

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))

const PlaygroundRoutes = React.lazy(() => import('@components/Playground/PlaygroundRoutes'))

export const AllRoutes = () => {
    const { isAuthenticated } = useAuth()

    return (
        <>
            <Routes>
                <Route element={<ResponsiveOutlet />}>
                    {/* TODO: Remove extra level */}
                    <Route element={<Outlet />}>
                        <>
                            {!isAuthenticated ? (
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
                                <Route path="*" element={<AuthenticatedRoutes />} />
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
