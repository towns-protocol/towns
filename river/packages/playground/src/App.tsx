import { RouterProvider } from 'react-router-dom'
import { WagmiConfig, configureChains, createConfig, mainnet } from 'wagmi'
import { publicProvider } from 'wagmi/providers/public'
import { InjectedConnector } from 'wagmi/connectors/injected'
import { RiverSyncProvider } from '@river-build/react-sdk'
import { router } from './routes'

const { publicClient, webSocketPublicClient } = configureChains([mainnet], [publicProvider()])

const config = createConfig({
    autoConnect: true,
    publicClient,
    webSocketPublicClient,
    connectors: [new InjectedConnector()],
})

function App() {
    return (
        <WagmiConfig config={config}>
            <RiverSyncProvider>
                <RouterProvider router={router} />
            </RiverSyncProvider>
        </WagmiConfig>
    )
}

export default App
