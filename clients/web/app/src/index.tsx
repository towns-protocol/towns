import 'allotment/dist/style.css'
import 'index.css'
import { init as SentryInit, Replay as SentryReplay } from '@sentry/react'
import { BrowserTracing } from '@sentry/browser'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { datadogLogs } from '@datadog/browser-logs'
import { Main } from 'Main'
import { env } from 'utils'

console.log(
    `%c\n\nTOWNS\n%c${APP_VERSION}[${APP_COMMIT_HASH}]\n${env.DEV ? 'DEV' : ''}${'\n'.repeat(3)}`,
    `font-size:32px;font-weight:bold;font-family:sans-serif;`,
    ``,
)

if (env.DEV) {
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
} else if (!env.VITE_DISABLE_SENTRY) {
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
        replaysSessionSampleRate: 1.0,
        // If the entire session is not sampled, use the below sample rate to sample
        // sessions when an error occurs.
        replaysOnErrorSampleRate: 1.0,
        integrations: [new SentryReplay(), new BrowserTracing()],
        release: env.VITE_APP_RELEASE_VERSION,
    })
}

if (env.VITE_DD_CLIENT_TOKEN && env.VITE_PRIMARY_PROTOCOL === 'casablanca') {
    datadogLogs.init({
        clientToken: env.VITE_DD_CLIENT_TOKEN,
        service: 'towns',
        forwardConsoleLogs: ['error'],
        forwardErrorsToLogs: true,
        sessionSampleRate: 10,
        telemetrySampleRate: 0,
        env: env.MODE,
    })

    console.info(`datadogLogs initialized for env: ${env.MODE}`)
} else {
    console.info('datadogLogs not initialized')
}

const node = document.getElementById('root')

if (!node) {
    // this would happen if HTML is malformed or absent
    throw new Error('no root node enable')
}

createRoot(node).render(<Main />)
