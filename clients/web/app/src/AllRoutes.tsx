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
import { env, isTownBanned } from 'utils'
import { AppStoreBanner } from '@components/AppStoreBanner/AppStoreBanner'
import { ExploreMobile, ExplorePage } from 'routes/ExplorePage/ExplorePage'
import { BannedTownPage } from '@components/BannedTownPage/BannedTownPage'
import { useSpaceIdFromPathname } from 'hooks/useSpaceInfoFromPathname'

const BannedTownCheck = () => {
    const spaceId = useSpaceIdFromPathname()

    console.log('AllRoutes: banned town check', { spaceId })

    if (spaceId && isTownBanned(spaceId)) {
        return <BannedTownPage />
    }

    return <PublicTownPageForUnauthenticatedRoute />
}

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
                                        element={<BannedTownCheck />}
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
