import 'allotment/dist/style.css'
// Only load Sentry in production
// eslint-disable-next-line @typescript-eslint/no-var-requires
import Gleap from 'gleap'
import * as Sentry from '@sentry/react'
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { BrowserTracing } from '@sentry/tracing'
import { ErrorBoundary } from 'react-error-boundary'

import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MainLayout } from 'MainLayout'
import { env } from 'utils'
import { LoadingScreen } from 'routes/LoadingScreen'
import { useRootTheme } from 'hooks/useRootTheme'
import { AppErrorFallback } from 'AppErrorFallback'
const App = React.lazy(() => import('./App'))

if (env.IS_DEV) {
    // Register runtime-error overlay
    // From: https://github.com/vitejs/vite/issues/2076
    const showErrorOverlay = (event: ErrorEvent) => {
        // must be within function call because that's when the element is defined for sure.
        const ErrorOverlay = customElements.get('vite-error-overlay')
        // don't open outside vite environment
        if (!ErrorOverlay) {
            return
        }
        console.log(event.error)
        const overlay = new ErrorOverlay(event.error)
        document.body.appendChild(overlay)
    }
    window.addEventListener('error', showErrorOverlay)
    window.addEventListener('unhandledrejection', ({ reason }) => showErrorOverlay(reason))
} else {
    Sentry.init({
        dsn:
            env.VITE_SENTRY_DSN ||
            'https://a5bc2df7099a4adbadd6ff1f87c7b66a@o327188.ingest.sentry.io/4504600696061952',
        // Set tracesSampleRate to 1.0 to capture 100%
        // of transactions for performance monitoring.
        // We recommend adjusting this value in production
        tracesSampleRate: 1.0,
        // This sets the sample rate to be 10%. You may want this to be 100% while
        // in development and sample at a lower rate in production
        replaysSessionSampleRate: 0.1,
        // If the entire session is not sampled, use the below sample rate to sample
        // sessions when an error occurs.
        replaysOnErrorSampleRate: 1.0,
        integrations: [new Sentry.Replay(), new BrowserTracing()],
        release: env.VITE_APP_RELEASE_VERSION,
    })
}

Gleap.initialize(env.VITE_GLEAP_API_KEY || '')
Gleap.showFeedbackButton(true)
Gleap.setEnvironment(env.IS_DEV ? 'dev' : 'prod')

const node = document.getElementById('root')

const Main = () => {
    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: false,
    })

    return (
        <React.StrictMode>
            <BrowserRouter>
                <MainLayout>
                    <ErrorBoundary FallbackComponent={AppErrorFallback}>
                        <Suspense fallback={<LoadingScreen />}>
                            <App />
                        </Suspense>
                    </ErrorBoundary>
                </MainLayout>
            </BrowserRouter>
        </React.StrictMode>
    )
}

if (node) {
    if (env.IS_DEV) {
        import(`../mocks/browser`)
            .then(({ worker }) => {
                worker.start({
                    onUnhandledRequest: 'bypass',
                })
            })
            .then(() => {
                createRoot(node).render(<Main />)
            })
    } else {
        createRoot(node).render(<Main />)
    }
}
