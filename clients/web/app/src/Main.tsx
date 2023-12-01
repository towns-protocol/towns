import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppErrorFallback } from 'AppErrorFallback'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { PrivyProvider } from 'PrivyProvider'
import { ClearStaleWagmiStorage } from 'ClearStaleWagmiStorage'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { env } from 'utils'

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
                    <Suspense fallback={<WelcomeLayout debugText="lazy loading app" />}>
                        <ZLayerProvider>
                            <App />
                            {/* the service worker won't exist in dev-mode and there's not need to check for updates */}
                            {(!env.DEV || env.VITE_PUSH_NOTIFICATION_ENABLED) && <ReloadPrompt />}
                        </ZLayerProvider>
                    </Suspense>
                </BrowserRouter>
            </PrivyProvider>
        </ErrorBoundary>
    )
}
