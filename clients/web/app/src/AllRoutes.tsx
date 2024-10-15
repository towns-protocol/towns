import React from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { useConnectivity } from 'use-towns-client'
import { DebugRoute } from '@components/DebugBar/DebugBar'
import { PlaygroundLazy } from '@components/Playground/PlaygroundLazy'
import { Box, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { PATHS } from 'routes'
import { AuthenticatedRoutes } from 'routes/AuthenticatedRoutes'
import { NotificationRoute } from 'routes/NotificationRoute'
import { PublicSupportPage } from 'routes/PublicSupportPage/PublicSupportPage'
import { PublicTownPage } from 'routes/PublicTownPage/PublicTownPage'
import { WelcomeRoute } from 'routes/Welcome'
import { mobileAppClass } from 'ui/styles/globals/utils.css'
import { env } from 'utils'
import { AppStoreBanner } from '@components/AppStoreBanner/AppStoreBanner'

export const AllRoutes = React.memo(() => {
    const { isAuthenticated } = useConnectivity()

    return (
        <>
            <NotificationRoute />
            <Routes>
                <Route element={<ResponsiveOutlet />}>
                    {/* TODO: Remove extra level */}
                    <Route element={<Outlet />}>
                        <>
                            {!isAuthenticated ? (
                                <>
                                    <Route
                                        path={`${PATHS.SPACES}/new`}
                                        element={<Navigate to="/" />}
                                    />
                                    <Route
                                        path={`${PATHS.SPACES}/:spaceSlug/*`}
                                        element={<PublicTownPage />}
                                    />
                                    <Route path="*" element={<WelcomeRoute />} />
                                </>
                            ) : (
                                <Route path="*" element={<AuthenticatedRoutes />} />
                            )}
                        </>
                    </Route>

                    <Route path="/playground/*" element={<PlaygroundLazy />} />
                    <Route path="/help" element={<PublicSupportPage />} />
                    {env.DEV && <Route path="/env" element={<DebugRoute />} />}
                </Route>
            </Routes>
        </>
    )
})

const ResponsiveOutlet = () => {
    const { isTouch } = useDevice()

    return isTouch ? (
        <Box className={mobileAppClass}>
            <AppStoreBanner />
            <Outlet />
        </Box>
    ) : (
        <Stack grow color="default" minHeight="100vh">
            <Outlet />
        </Stack>
    )
}
