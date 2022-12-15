import React from 'react'
import { Outlet, Route, Routes } from 'react-router'

import {
    SpaceProtocol,
    WalletStatus,
    ZionContextProvider,
    useMatrixStore,
    useWeb3Context,
} from 'use-zion-client'
import { Box, Heading } from '@ui'
import { AppLayout } from 'AppLayout'
import { useRootTheme } from 'hooks/useRootTheme'
import { Register } from 'routes/Register'
import { SiteHome } from 'routes/SiteHome'
import { SpacesNew } from 'routes/SpacesNew'
import { SidebarLayout } from 'SidebarLayout'
import { FontLoader } from 'ui/utils/FontLoader'
import { PATHS } from 'routes'
import { QueryProvider } from 'api/queryClient'
import { useWindowListener } from 'hooks/useWindowListener'
import { isDev } from 'utils'
import { DebugBar } from '@components/DebugBar'

const SpaceRoutes = React.lazy(() => import('routes/SpaceRoutes'))
const Playground = React.lazy(() => import('@components/Playground'))

FontLoader.init()

const MATRIX_HOMESERVER_URL = import.meta.env.VITE_MATRIX_HOMESERVER_URL
const CASABLANCA_SERVER_URL = import.meta.env.VITE_CASABLANCA_SERVER_URL ?? ''
const ZION_SPACE_ID = '!YtwhtUR6ghEUoc7H:node1.zion.xyz'
const ZION_SPACE_NAME = 'Zion Preview' // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
const ZION_SPACE_AVATAR_SRC = '/placeholders/nft_10.png' // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188

export const App = () => {
    return (
        <ZionContextProvider
            disableEncryption
            primaryProtocol={SpaceProtocol.Matrix}
            homeServerUrl={MATRIX_HOMESERVER_URL}
            casablancaServerUrl={CASABLANCA_SERVER_URL}
            defaultSpaceId={ZION_SPACE_ID}
            defaultSpaceName={ZION_SPACE_NAME}
            defaultSpaceAvatarSrc={ZION_SPACE_AVATAR_SRC}
            onboardingOpts={{ skipAvatar: true }}
            initialSyncLimit={100}
        >
            <QueryProvider>
                <>{isDev && <DebugBar MATRIX_HOMESERVER_URL={MATRIX_HOMESERVER_URL} />}</>
                <AllRoutes />
            </QueryProvider>
        </ZionContextProvider>
    )
}

const AllRoutes = () => {
    const { isAuthenticated } = useMatrixStore()
    const { walletStatus } = useWeb3Context()
    const isAuthed = isAuthenticated && walletStatus !== WalletStatus.Disconnected

    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: false,
    })

    useWindowListener()

    return (
        <Routes>
            <Route element={<AppLayout />}>
                <Route element={<Outlet />}>
                    <Route path="*" element={<SiteHome />} />
                    <Route
                        element={
                            <Box grow centerContent>
                                <Outlet />
                            </Box>
                        }
                    >
                        <Route path="/manifesto" element={<Heading>MANIFESTO</Heading>} />
                        <Route path="/protocol" element={<Heading>PROTOCOL</Heading>} />
                        <Route path="/dao" element={<Heading>DAO</Heading>} />
                    </Route>
                    {isAuthed && (
                        <>
                            <Route path={`/${PATHS.PREFERENCES}`} element={<Register isEdit />} />
                            <Route path="*" element={<SidebarLayout />}>
                                <Route path="*" element={<SpaceRoutes />} />
                            </Route>
                            <Route path="spaces/new" element={<SpacesNew />} />
                        </>
                    )}
                </Route>
                <Route path="/playground" element={<Playground />} />
            </Route>
        </Routes>
    )
}

export default App
