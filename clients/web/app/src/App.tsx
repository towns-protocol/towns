import React from 'react'
import { Outlet, Route, Routes } from 'react-router'
import { SpaceProtocol, ZionContextProvider } from 'use-zion-client'
import { PlaygroundRoutes } from '@components/Playground/PlaygroundRoutes'
import { Stack } from '@ui'
import { QueryProvider } from 'api/queryClient'
import { useAuth } from 'hooks/useAuth'
import { useWindowListener } from 'hooks/useWindowListener'
import { PATHS } from 'routes'
import { Register } from 'routes/Register'
import { Welcome } from 'routes/Welcome'
import { AppPanelLayout } from 'SidebarLayout'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { useMatrixHomeServerUrl } from 'hooks/useMatrixHomeServerUrl'
import { TransactionEvents } from 'TransactionEvents'
import { LoadingScreen } from 'routes/LoadingScreen'

const SpaceRoutes = React.lazy(() => import('routes/SpaceRoutes'))
const Playground = React.lazy(() => import('@components/Playground'))
const DebugBar = React.lazy(() => import('@components/DebugBar/DebugBar'))

FontLoader.init()

const CASABLANCA_SERVER_URL = env.VITE_CASABLANCA_SERVER_URL ?? ''
const ZION_SPACE_ID = '!IX8l0ziEc4khEQch:node1.zion.xyz'
const ZION_SPACE_NAME = 'zion preview 2' // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const ZION_SPACE_AVATAR_SRC = '/placeholders/nft_10.png' // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188

export const App = () => {
    const { homeserverUrl, ...rest } = useMatrixHomeServerUrl()

    return (
        <ZionContextProvider
            primaryProtocol={SpaceProtocol.Matrix}
            casablancaServerUrl={CASABLANCA_SERVER_URL}
            homeServerUrl={homeserverUrl}
            defaultSpaceId={ZION_SPACE_ID}
            defaultSpaceName={ZION_SPACE_NAME}
            defaultSpaceAvatarSrc={ZION_SPACE_AVATAR_SRC}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={100}
        >
            <QueryProvider>
                <>{env.IS_DEV && <DebugBar homeserverUrl={homeserverUrl} {...rest} />}</>
                <TransactionEvents />
                <AllRoutes />
            </QueryProvider>
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
                    <Route path="*" element={<Welcome />} />
                    {isAuthenticatedAndConnected && (
                        <>
                            <Route path={`/${PATHS.PREFERENCES}`} element={<Register isEdit />} />
                            <Route path="*" element={<AppPanelLayout />}>
                                <Route path="*" element={<SpaceRoutes />} />
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

const AppLayout = () => {
    return (
        <Stack grow color="default" minHeight="100vh">
            <Outlet />
        </Stack>
    )
}
