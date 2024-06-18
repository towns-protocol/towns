import React from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { useConnectivity } from 'use-towns-client'
import { Box, Stack } from '@ui'
import { useDevice } from 'hooks/useDevice'
import { WelcomeRoute } from 'routes/Welcome'
import { mobileAppClass } from 'ui/styles/globals/utils.css'
import { PATHS } from 'routes'
import { AuthenticatedRoutes } from 'routes/AuthenticatedRoutes'
import { PlaygroundLazy } from '@components/Playground/PlaygroundLazy'
import { PublicTownPage } from 'routes/PublicTownPage/PublicTownPage'
import { NotificationRoute } from 'routes/NotificationRoute'
import { env } from 'utils'
import { DebugRoute } from '@components/DebugBar/DebugBar'

export const AllRoutes = () => {
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
                    {env.DEV && <Route path="/env" element={<DebugRoute />} />}
                </Route>
            </Routes>
        </>
    )
}

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
