import { RouterProvider } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'

import { RiverSyncProvider, connectRiver } from '@towns-protocol/react-sdk'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type SyncAgent } from '@towns-protocol/sdk'
import { router } from './routes'
import { wagmiConfig } from './config/wagmi'
import { loadAuth } from './utils/persist-auth'

function App() {
    const [queryClient] = useState(() => new QueryClient())
    const [syncAgent, setSyncAgent] = useState<SyncAgent | undefined>()
    const [persistedAuth] = useState(() => loadAuth())

    useEffect(() => {
        if (persistedAuth) {
            connectRiver(persistedAuth.signerContext, {
                riverConfig: persistedAuth.riverConfig,
            }).then((syncAgent) => setSyncAgent(syncAgent))
        }
    }, [persistedAuth])

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RiverSyncProvider
                    syncAgent={syncAgent}
                    config={{
                        onTokenExpired: () => router.navigate('/auth'),
                    }}
                >
                    {!persistedAuth ? (
                        <RouterProvider router={router} />
                    ) : syncAgent && persistedAuth ? (
                        // Wait for the sync agent to be ready if we have a persisted auth
                        <RouterProvider router={router} />
                    ) : (
                        <></>
                    )}
                </RiverSyncProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

export default App
