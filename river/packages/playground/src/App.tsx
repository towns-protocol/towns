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

    useEffect(() => {
        const auth = loadAuth()
        if (auth) {
            connectRiver(auth.signerContext, { riverConfig: auth.riverConfig }).then((syncAgent) =>
                setSyncAgent(syncAgent),
            )
        }
    }, [])

    return (
        <WagmiConfig config={config}>
            <QueryClientProvider client={queryClient}>
                <RiverSyncProvider syncAgent={syncAgent}>
                    <RouterProvider router={router} />
                </RiverSyncProvider>
            </QueryClientProvider>
        </WagmiConfig>
    )
}

export default App
