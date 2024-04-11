import React, { Suspense } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { debug } from 'debug'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppErrorFallback } from 'AppErrorFallback'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { usePeriodicUpdates } from 'hooks/usePeriodicUpdates'

const App = React.lazy(() => import('App'))

const locationLog = debug('router:location:')

const DebugRouter = ({ children }: { children: JSX.Element }) => {
    const location = useLocation()
    locationLog(
        `\nRoute: ${location.pathname}${location.search}, \nState: ${JSON.stringify(
            location.state,
        )}`,
    )
    return children
}
export const Main = () => {
    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: true,
    })
    usePeriodicUpdates()

    return (
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <BrowserRouter>
                <DebugRouter>
                    <Suspense fallback={<WelcomeLayout debugText="lazy loading app" />}>
                        <ZLayerProvider>
                            <App />
                        </ZLayerProvider>
                    </Suspense>
                </DebugRouter>
            </BrowserRouter>
        </ErrorBoundary>
    )
}
