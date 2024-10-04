import React, { Suspense, useEffect, useMemo } from 'react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '@components/ErrorBoundary/ErrorBoundary'
import { AppErrorFallback } from 'AppErrorFallback'
import { ZLayerProvider } from '@ui'
import { useRootTheme } from 'hooks/useRootTheme'
import { usePeriodicUpdates } from 'hooks/usePeriodicUpdates'
import { Analytics, trackTime } from 'hooks/useAnalytics'
import { AppProgressOverlay } from '@components/AppProgressOverlay/AppProgressOverlay'
import { AppProgressState } from '@components/AppProgressOverlay/AppProgressState'
import { WelcomeLayout } from 'routes/layouts/WelcomeLayout'
import { AppProgressOverlayTrigger } from '@components/AppProgressOverlay/AppProgressOverlayTrigger'
import { AboveAppProgressOverlay } from '@components/AppProgressOverlay/AboveAppProgress/AboveAppProgress'
import { AppBugReportOverlay } from '@components/AppBugReport/AppBugReportOverlay'
import { PATHS } from 'routes'
import { StartupProvider } from 'StartupProvider'

const App = React.lazy(() => import('App'))

const DebugRouter = ({ children }: { children: JSX.Element }) => {
    const location = useLocation()
    console.log(
        `[routing] ${location.pathname}${location.search}, \nState: ${JSON.stringify(
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

    useEffect(() => {
        console.log('[analytics] Main useEffect')
        trackTime('app startup: static logo showing', {
            stage: 'static_logo',
        })
        Analytics.getInstance().identify({}, () => {
            console.log('[analytics] identify')
        })
    }, [])

    usePeriodicUpdates()

    const isHomeRoute = useMemo(() => window.location.pathname === '/', [])
    const isTownPageRoute = useMemo(
        () => window.location.pathname.match(new RegExp(`/${PATHS.SPACES}/[a-f0-9]{64}/?$`)),
        [],
    )

    return (
        <>
            <ErrorBoundary FallbackComponent={AppErrorFallback}>
                <StartupProvider>
                    <BrowserRouter>
                        <DebugRouter>
                            <Suspense
                                fallback={
                                    isHomeRoute ? (
                                        <WelcomeLayout />
                                    ) : isTownPageRoute ? (
                                        <></>
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
                </StartupProvider>
            </ErrorBoundary>
            <AppBugReportOverlay />
        </>
    )
}
