import { RouterProvider } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'

import { TownsSyncProvider, connectTowns } from '@towns-protocol/react-sdk'

import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type SyncAgent } from '@towns-protocol/sdk'
import { createFallbackDecryptor } from '@towns-protocol/sdk/src/decryption/fallbackDecryptor'
import { router } from './routes'
import { wagmiConfig } from './config/wagmi'
import { loadAuth } from './utils/persist-auth'
import { createUnpackerWorkerpool } from './utils/unpacker'
import { workerPool } from './utils/workers'
import { createDecryptorWorkerpool } from './utils/decryptor'
import { decryptorWorkerPool } from './utils/decryptorWorkers'

function App() {
    const [queryClient] = useState(() => new QueryClient())
    const [syncAgent, setSyncAgent] = useState<SyncAgent | undefined>()
    const [persistedAuth] = useState(() => loadAuth())

    useEffect(() => {
        if (persistedAuth) {
            // Create worker-based decryptor with fallback to main thread
            const workerDecryptor = createDecryptorWorkerpool(decryptorWorkerPool)
            const fallbackDecryptor = createFallbackDecryptor(workerDecryptor)

            connectTowns(persistedAuth.signerContext, {
                riverConfig: persistedAuth.riverConfig,
                clientOptions: {
                    unpacker: createUnpackerWorkerpool(workerPool),
                    decryptor: fallbackDecryptor,
                },
            }).then((syncAgent) => setSyncAgent(syncAgent))
        }
    }, [persistedAuth])

    useEffect(() => {
        // Cleanup worker pools on unmount
        return () => {
            workerPool.terminate()
            decryptorWorkerPool.terminate()
        }
    }, [])

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <TownsSyncProvider
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
                </TownsSyncProvider>
            </QueryClientProvider>
        </WagmiProvider>
    )
}

export default App
