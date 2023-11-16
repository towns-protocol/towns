import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Container } from '@mui/material'
import { ZionContextProvider } from 'use-zion-client'
import { ThemeProvider } from '@mui/material/styles'
import { SetSignerFromWalletClient } from '@towns/privy'
import { Thread } from 'routes/Thread'
import { Threads } from 'routes/Threads'
import { Mentions } from 'routes/Mentions'
import { AlphaAccessMainPage } from 'routes/AlphaAccess'
import { Login } from '@components/Login'
import { VersionsPage } from 'routes/VersionsPage'
import { useEnvironment } from 'hooks/use-environment'
import { PrivyProvider } from 'context/PrivyProvider'
import { WalletLinkingPage } from 'routes/WalletLinkingPage'
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

export const App = () => {
    const { casablancaUrl, chainId } = useEnvironment()
    return (
        <PrivyProvider>
            <ThemeProvider theme={theme}>
                <Container maxWidth="md">
                    <ZionContextProvider
                        enableSpaceRootUnreads
                        casablancaServerUrl={casablancaUrl}
                        chainId={chainId}
                        logNamespaceFilter="csb:*"
                        onboardingOpts={{ skipAvatar: true, showWelcomeSpash: false }}
                        initialSyncLimit={100}
                    >
                        <>
                            <SetSignerFromWalletClient chainId={chainId} />
                            <Routes>
                                <Route path="/alpha-access" element={<AlphaAccessMainPage />} />
                                <Route path="/versions" element={<VersionsPage />} />
                                <Route element={<MainLayout />}>
                                    <Route element={<AuthenticatedContent />}>
                                        <Route index element={<Home />} />
                                        <Route path="spaces/new" element={<SpacesNew />} />
                                        <Route path="spaces/:spaceSlug" element={<Spaces />}>
                                            <Route index element={<SpacesIndex />} />
                                            <Route path="settings" element={<RoomSettings />} />
                                            <Route path="invite" element={<SpaceInvite />} />
                                            <Route
                                                path="channels/new"
                                                element={<SpacesNewChannel />}
                                            />
                                            <Route
                                                path="channels/:channelSlug"
                                                element={<Channels />}
                                            >
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
                                        <Route
                                            path="wallet-linking"
                                            element={<WalletLinkingPage />}
                                        />
                                        <Route path="logins" element={<Login />} />
                                        <Route path="*" element={<NotFound />} />
                                    </Route>
                                </Route>
                            </Routes>
                        </>
                    </ZionContextProvider>
                </Container>
            </ThemeProvider>
        </PrivyProvider>
    )
}

export default App
