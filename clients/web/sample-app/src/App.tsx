import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Container } from '@mui/material'
import { SpaceProtocol, ZionContextProvider } from 'use-zion-client'
import { ThemeProvider } from '@mui/material/styles'
import { Thread } from 'routes/Thread'
import { Threads } from 'routes/Threads'
import { Mentions } from 'routes/Mentions'
import { useSampleAppStore } from 'store/store'
import { AlphaAccessMainPage } from 'routes/AlphaAccess'
import { Home } from './routes/Home'
import { MainLayout } from './components/MainLayout'
import { NotFound } from './routes/NotFound'
import { RoomSettings } from './routes/RoomSettings'
import { SpaceInvite } from './routes/SpaceInvite'
import { Spaces } from './routes/Spaces'
import { SpacesIndex } from './routes/SpacesIndex'
import { SpacesNew } from './routes/SpacesNew'
import { SpacesNewChannel } from './routes/SpacesNewChannel'
import { Web3 } from './routes/Web3'
import theme from './theme'
import { ChannelsIndex } from './routes/ChannelsIndex'
import { Channels } from './routes/Channels'
import { AuthenticatedContent } from './routes/AuthenticatedContent'

const MATRIX_HOMESERVER_URL = import.meta.env.VITE_MATRIX_HOMESERVER_URL ?? ``
const CASABLANCA_SERVER_URL = import.meta.env.VITE_CASABLANCA_SERVER_URL ?? ''
const ALCHEMY_KEY = import.meta.env.VITE_ALCHEMY_API_KEY ?? ''

export const App = () => {
    const { homeServerUrl: savedHomeServerUrl } = useSampleAppStore()
    const homeServerUrl = savedHomeServerUrl ?? MATRIX_HOMESERVER_URL
    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="md">
                <ZionContextProvider
                    enableSpaceRootUnreads
                    alchemyKey={ALCHEMY_KEY}
                    primaryProtocol={SpaceProtocol.Matrix}
                    matrixServerUrl={homeServerUrl}
                    casablancaServerUrl={CASABLANCA_SERVER_URL}
                    onboardingOpts={{ skipAvatar: true, showWelcomeSpash: false }}
                    initialSyncLimit={100}
                >
                    <Routes>
                        <Route path="/alpha-access" element={<AlphaAccessMainPage />} />
                        <Route element={<MainLayout />}>
                            <Route element={<AuthenticatedContent />}>
                                <Route index element={<Home />} />
                                <Route path="spaces/new" element={<SpacesNew />} />
                                <Route path="spaces/:spaceSlug" element={<Spaces />}>
                                    <Route index element={<SpacesIndex />} />
                                    <Route path="settings" element={<RoomSettings />} />
                                    <Route path="invite" element={<SpaceInvite />} />
                                    <Route path="channels/new" element={<SpacesNewChannel />} />
                                    <Route path="channels/:channelSlug" element={<Channels />}>
                                        <Route index element={<ChannelsIndex />} />
                                        <Route path="settings" element={<RoomSettings />} />
                                    </Route>
                                    <Route path="threads" element={<Threads />} />
                                    <Route
                                        path="threads/:channelSlug/:threadParentId"
                                        element={<Thread />}
                                    />
                                    <Route path="mentions" element={<Mentions />} />
                                </Route>
                                <Route path="web3" element={<Web3 />} />
                                <Route path="*" element={<NotFound />} />
                            </Route>
                        </Route>
                    </Routes>
                </ZionContextProvider>
            </Container>
        </ThemeProvider>
    )
}

export default App
