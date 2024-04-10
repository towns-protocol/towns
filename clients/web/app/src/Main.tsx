import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppErrorFallback } from 'AppErrorFallback'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { usePeriodicUpdates } from 'hooks/usePeriodicUpdates'

const App = React.lazy(() => import('App'))

export const Main = () => {
    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: true,
    })
    usePeriodicUpdates()

    return (
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <BrowserRouter>
                <Suspense fallback={<WelcomeLayout debugText="lazy loading app" />}>
                    <ZLayerProvider>
                        <App />
                    </ZLayerProvider>
                </Suspense>
            </BrowserRouter>
        </ErrorBoundary>
    )
}
