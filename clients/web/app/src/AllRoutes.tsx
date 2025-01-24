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
import { PublicTownPageForUnauthenticatedRoute } from 'routes/PublicTownPage/PublicTownPage'
import { WelcomeRoute } from 'routes/Welcome'
import { mobileAppClass } from 'ui/styles/globals/utils.css'
import { env } from 'utils'
import { AppStoreBanner } from '@components/AppStoreBanner/AppStoreBanner'
import { ExploreMobile, ExplorePage } from 'routes/ExplorePage/ExplorePage'

export const AllRoutes = React.memo(() => {
    const { isAuthenticated } = useConnectivity()
    const { isTouch } = useDevice()

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
                                        element={<PublicTownPageForUnauthenticatedRoute />}
                                    />
                                    <Route
                                        path={PATHS.EXPLORE}
                                        element={isTouch ? <ExploreMobile /> : <ExplorePage />}
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

    return (
        <Box
            className={isTouch ? mobileAppClass : undefined}
            height="100vh"
            width="100vw"
            position="fixed"
            overflow="hidden"
        >
            <Stack height="100%">
                <Box grow>
                    <Outlet />
                </Box>
                {isTouch && <AppStoreBanner />}
            </Stack>
        </Box>
    )
}
