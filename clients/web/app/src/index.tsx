import 'allotment/dist/style.css'
import 'index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { datadogLogs } from '@datadog/browser-logs'
import { datadogRum } from '@datadog/browser-rum'
import { Main } from 'Main'
import { env } from 'utils'
import { bufferedLogger } from 'utils/wrappedlogger'

if (!env.DEV) {
    console.log = bufferedLogger.getLogger().info
    console.info = bufferedLogger.getLogger().info
    console.warn = bufferedLogger.getLogger().warn
    console.debug = bufferedLogger.getLogger().debug
    console.error = bufferedLogger.getLogger().error
}

console.log(
    `%c\n\nTOWNS\n%c${APP_VERSION}[${APP_COMMIT_HASH}]\n${env.DEV ? 'DEV' : ''}${'\n'.repeat(3)}`,
    `font-size:32px;font-weight:bold;font-family:sans-serif;`,
    ``,
)

// fixes: uncaught ReferenceError: global is not defined for 3rd party libs
window.global ||= globalThis

const datadogEnvName = env.VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER
    ? `transient-${env.VITE_TRANSIENT_ENV_GITHUB_PR_NUMBER}`
    : env.MODE

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
}

if (env.VITE_DD_CLIENT_TOKEN) {
    const service = 'towns-webapp'

    datadogRum.init({
        applicationId: 'c6afdc65-2431-48ff-b8f2-c4879fc75293',
        clientToken: 'pub947b3cbe543e47b9a64b2abca5028974',
        site: 'datadoghq.com',
        service,
        version: env.VITE_APP_RELEASE_VERSION,
        env: datadogEnvName,
        sessionSampleRate: 100,
        sessionReplaySampleRate: 100,
        trackUserInteractions: true,
        trackResources: true,
        trackLongTasks: true,
        defaultPrivacyLevel: 'mask-user-input',
    })

    datadogLogs.init({
        clientToken: env.VITE_DD_CLIENT_TOKEN,
        service,
        forwardConsoleLogs: env.VITE_LOG_FORWARDING,
        forwardErrorsToLogs: true,
        sessionSampleRate: env.VITE_LOG_SAMPLING_RATE,
        telemetrySampleRate: 0,
        env: datadogEnvName,
        version: env.VITE_APP_RELEASE_VERSION,
        beforeSend: (event) => {
            event.session_id = datadogRum.getInternalContext()?.session_id
        },
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
