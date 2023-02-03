import React from 'react'
import { Navigate, Outlet, Route, Routes } from 'react-router'
import { SpaceProtocol, ZionContextProvider } from 'use-zion-client'

import { PlaygroundRoutes } from '@components/Playground/PlaygroundRoutes'
import { Stack } from '@ui'
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

const AuthenticatedRoutes = React.lazy(() => import('routes/AuthenticatedRoutes'))
const InviteLinkLanding = React.lazy(() => import('routes/InviteLinkLanding'))
const Playground = React.lazy(() => import('@components/Playground'))
const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

const CASABLANCA_SERVER_URL = env.VITE_CASABLANCA_SERVER_URL ?? ''
const ZION_SPACE_ID = '!fvzsFgAvzQ5Z2RJ9:node1.zion.xyz'
const ZION_SPACE_NAME = 'zion preview 3' // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const ZION_SPACE_AVATAR_SRC = '/placeholders/nft_10.png' // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188

export const App = () => {
    const { homeserverUrl, ...rest } = useMatrixHomeServerUrl()
    const chain = useCorrectChainForServer()

    return (
        <ZionContextProvider
            alchemyKey={env.VITE_ALCHEMY_API_KEY}
            primaryProtocol={SpaceProtocol.Matrix}
            casablancaServerUrl={CASABLANCA_SERVER_URL}
            homeServerUrl={homeserverUrl}
            defaultSpaceId={homeserverUrl === HomeServerUrl.REMOTE ? ZION_SPACE_ID : undefined}
            defaultSpaceName={ZION_SPACE_NAME}
            defaultSpaceAvatarSrc={ZION_SPACE_AVATAR_SRC}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={100}
            chain={chain}
        >
            <AnalyticsProvider>
                <>{env.IS_DEV && <DebugBar homeserverUrl={homeserverUrl} {...rest} />}</>
                <AllRoutes />
            </AnalyticsProvider>
        </ZionContextProvider>
    )
}

const AllRoutes = () => {
    const { isAuthenticatedAndConnected, connectLoading } = useAuth()

    useWindowListener()

    if (connectLoading) {
        return <LoadingScreen />
    }

    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route element={<Outlet />}>
                    {!isAuthenticatedAndConnected && (
                        <>
                            <Route path={PATHS.REGISTER} element={<Welcome />} />
                            <Route path={PATHS.LOGIN} element={<Welcome />} />
                            <Route
                                path={`${PATHS.SPACES}/:spaceSlug`}
                                element={<InviteLinkLanding />}
                            />
                            <Route path="*" element={<RedirectToLoginWithSavedLocation />} />
                        </>
                    )}

                    {isAuthenticatedAndConnected && (
                        <>
                            <Route path={`/${PATHS.PREFERENCES}`} element={<Register isEdit />} />
                            <Route path="*" element={<AppPanelLayout />}>
                                <Route path="*" element={<AuthenticatedRoutes />} />
                            </Route>
                        </>
                    )}
                </Route>
                <Route path="/playground" element={<Playground />} />
                <Route path="/playground/*" element={<PlaygroundRoutes />} />
            </Route>
        </Routes>
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
