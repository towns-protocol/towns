import { ErrorBoundary } from '@sentry/react'
import React, { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppErrorFallback } from 'AppErrorFallback'
import { LoadingScreen } from 'routes/LoadingScreen'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { PrivyProvider } from 'PrivyProvider'

const App = React.lazy(() => import('App'))

export const Main = () => {
    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: true,
    })

    return (
        <ErrorBoundary fallback={(props) => <AppErrorFallback {...props} />}>
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
