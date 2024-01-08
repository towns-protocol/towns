import React from 'react'
import { Route, Routes } from 'react-router-dom'
import { Container } from '@mui/material'
import { ZionContextProvider } from 'use-zion-client'
import { ThemeProvider } from '@mui/material/styles'
import { EmbeddedSignerContextProvider } from '@towns/privy'
import { PrivyWagmiConnector } from '@privy-io/wagmi-connector'
import { Thread } from 'routes/Thread'
import { Threads } from 'routes/Threads'
import { Mentions } from 'routes/Mentions'
import { Login } from '@components/Login'
import { VersionsPage } from 'routes/VersionsPage'
import { useEnvironment } from 'hooks/use-environment'
import { PrivyProvider, wagmiChainsConfig } from 'context/PrivyProvider'
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

export const TestApp = () => {
    return (
        <PrivyWagmiConnector wagmiChainsConfig={wagmiChainsConfig}>
            <AppContent />
        </PrivyWagmiConnector>
    )
}

export const App = () => {
    return (
        <PrivyProvider>
            <AppContent />
        </PrivyProvider>
    )
}

const AppContent = () => {
    const { casablancaUrl, chainId } = useEnvironment()
    return (
        <ThemeProvider theme={theme}>
            <Container maxWidth="md">
                <ZionContextProvider
                    enableSpaceRootUnreads
                    casablancaServerUrl={casablancaUrl}
                    chainId={chainId}
                >
                    <EmbeddedSignerContextProvider chainId={chainId}>
                        <Routes>
                            <Route path="/versions" element={<VersionsPage />} />
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
                                    <Route path="wallet-linking" element={<WalletLinkingPage />} />
                                    <Route path="logins" element={<Login />} />
                                    <Route path="*" element={<NotFound />} />
                                </Route>
                            </Route>
                        </Routes>
                    </EmbeddedSignerContextProvider>
                </ZionContextProvider>
            </Container>
        </ThemeProvider>
    )
}
