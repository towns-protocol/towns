import 'allotment/dist/style.css'
import 'index.css'
import { init as SentryInit, Replay as SentryReplay } from '@sentry/react'
import { BrowserTracing } from '@sentry/browser'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Main } from 'Main'
import { env } from 'utils'

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
        const error = event.error || event
        if (!error) {
            console.error('no error found in event', event)
            return
        }
        console.log('showErrorOverlay:', error)
        const overlay = new ErrorOverlay(error)
        document.body.appendChild(overlay)
    }
    window.addEventListener('error', showErrorOverlay)
    window.addEventListener('unhandledrejection', ({ reason }) => showErrorOverlay(reason))
} else {
    SentryInit({
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
        integrations: [new SentryReplay(), new BrowserTracing()],
        release: env.VITE_APP_RELEASE_VERSION,
    })
}

const node = document.getElementById('root')

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
