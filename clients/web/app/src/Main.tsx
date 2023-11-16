import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppErrorFallback } from 'AppErrorFallback'
import { LoadingScreen } from 'routes/LoadingScreen'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { PrivyProvider } from 'PrivyProvider'
import { ClearStaleWagmiStorage } from 'ClearStaleWagmiStorage'

const App = React.lazy(() => import('App'))

export const Main = () => {
    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: true,
    })

    return (
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <ClearStaleWagmiStorage />
            <PrivyProvider>
                <BrowserRouter>
                    <Suspense fallback={<LoadingScreen />}>
                        <ZLayerProvider>
                            <App />
                        </ZLayerProvider>
                    </Suspense>
                </BrowserRouter>
            </PrivyProvider>
        </ErrorBoundary>
    )
}
