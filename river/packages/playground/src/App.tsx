import { RouterProvider } from 'react-router-dom'
import { WagmiConfig } from 'wagmi'

import { RiverSyncProvider, connectRiver } from '@river-build/react-sdk'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type SyncAgent } from '@river-build/sdk'
import { router } from './routes'
import { config } from './config/wagmi'
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
        <WagmiConfig config={config}>
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
        </WagmiConfig>
    )
}

export default App
