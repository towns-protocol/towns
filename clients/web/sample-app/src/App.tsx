import React, { useRef } from 'react'
import { Route, Routes } from 'react-router-dom'
import { TownsContextProvider } from 'use-towns-client'
import { ThemeProvider } from '@mui/material/styles'
import { EmbeddedSignerContextProvider } from '@towns/privy'
import { WagmiConfig, createConfig } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { foundry } from 'wagmi/chains'
import { SnapshotCaseType } from '@river-build/proto'
import { Thread } from 'routes/Thread'
import { Threads } from 'routes/Threads'
import { Mentions } from 'routes/Mentions'
import { Login } from '@components/Login'
import { useEnvironment } from 'hooks/use-environment'
import { PrivyProvider } from 'context/PrivyProvider'
import { WalletLinkingPage } from 'routes/WalletLinkingPage'
import { StreamsRoute } from 'routes/Streams'
import { ENVIRONMENTS } from 'utils/environment'
import { StreamRoute } from './routes/Stream'
import { Home } from './routes/Home'
import { MainLayout } from './components/MainLayout'
import { NotFound } from './routes/NotFound'
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
        // Using WagmiConfig instead of Privy/PrivyWagmi b/c needs a lot of mocking and we don't actually need a wallet for any of our unit tests
        <WagmiConfig
            config={createConfig({
                autoConnect: true,
                publicClient: createPublicClient({
                    chain: foundry,
                    transport: http(),
                }),
            })}
        >
            <AppContent />
        </WagmiConfig>
    )
}

export const App = () => {
    return (
        <PrivyProvider>
            <AppContent />
        </PrivyProvider>
    )
}

const streamFilter = new Set<SnapshotCaseType>() // create an empty stream filter to get all streams in the timelines store

const AppContent = () => {
    const _envornmentId = useRef<string | undefined>(undefined)
    const environment = useEnvironment()
    // Log environment changes
    if (environment.id !== _envornmentId.current) {
        _envornmentId.current = environment.id
        console.log('Environment: ', {
            current: environment.id,
            ENVIRONMENTS,
        })
    }
    const {
        id: environmentId,
        baseChain,
        baseChainConfig,
        riverChain,
        riverChainConfig,
    } = environment
    return (
        <ThemeProvider theme={theme}>
            <TownsContextProvider
                enableSpaceRootUnreads
                environmentId={environmentId}
                baseChain={baseChain}
                baseConfig={baseChainConfig}
                riverChain={riverChain}
                riverConfig={riverChainConfig}
                streamFilter={streamFilter}
            >
                <EmbeddedSignerContextProvider chainId={baseChain.id}>
                    <Routes>
                        <Route element={<MainLayout />}>
                            <Route element={<AuthenticatedContent />}>
                                <Route index element={<Home />} />
                                <Route path="spaces/new" element={<SpacesNew />} />
                                <Route path="spaces/:spaceSlug" element={<Spaces />}>
                                    <Route index element={<SpacesIndex />} />
                                    <Route path="invite" element={<SpaceInvite />} />
                                    <Route path="channels/new" element={<SpacesNewChannel />} />
                                    <Route path="channels/:channelSlug" element={<Channels />}>
                                        <Route index element={<ChannelsIndex />} />
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
                                <Route path="streams" element={<StreamsRoute />} />
                                <Route path="streams/:streamId" element={<StreamRoute />} />
                                <Route path="*" element={<NotFound />} />
                            </Route>
                        </Route>
                    </Routes>
                </EmbeddedSignerContextProvider>
            </TownsContextProvider>
        </ThemeProvider>
    )
}
