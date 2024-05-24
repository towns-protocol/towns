import React, { Suspense, useEffect, useMemo } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { debug } from 'debug'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppErrorFallback } from 'AppErrorFallback'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { usePeriodicUpdates } from 'hooks/usePeriodicUpdates'
import { useAnalytics } from 'hooks/useAnalytics'
import { AppProgressOverlay } from '@components/AppProgressOverlay/AppProgressOverlay'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { AboveAppProgressOverlay } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'

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

    const { analytics, anonymousId } = useAnalytics()
    useEffect(() => {
        analytics?.identify(
            anonymousId,
            {
                anonymousId,
            },
            () => {
                console.log('[analytics] anonymousId', anonymousId)
            },
        )
    }, [analytics, anonymousId])

    usePeriodicUpdates()

    const isHomeRoute = useMemo(() => window.location.pathname === '/', [])

    return (
        <ErrorBoundary FallbackComponent={AppErrorFallback}>
            <BrowserRouter>
                <DebugRouter>
                    <Suspense
                        fallback={
                            isHomeRoute ? (
                                <WelcomeLayout />
                            ) : (
                                <AppProgressOverlayTrigger
                                    progressState={AppProgressState.LoadingAssets}
                                    debugSource="Main suspense fallback"
                                />
                            )
                        }
                    >
                        <ZLayerProvider>
                            <App />
                        </ZLayerProvider>
                    </Suspense>
                </DebugRouter>
                <AppProgressOverlay />
                <AboveAppProgressOverlay />
            </BrowserRouter>
        </ErrorBoundary>
    )
}
