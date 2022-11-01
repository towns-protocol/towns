import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Container } from '@mui/material'
import { ZionContextProvider } from 'use-zion-client'
import { ThemeProvider } from '@mui/material/styles'
import { Home } from './routes/Home'
import { Main } from './components/Main'
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

const MATRIX_HOMESERVER_URL = import.meta.env.VITE_MATRIX_HOMESERVER_URL

export const App = () => {
    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="md">
                <ZionContextProvider
                    disableEncryption
                    enableSpaceRootUnreads
                    homeServerUrl={MATRIX_HOMESERVER_URL}
                    onboardingOpts={{ skipAvatar: true, showWelcomeSpash: false }}
                >
                    <Routes>
                        <Route element={<Main />}>
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
