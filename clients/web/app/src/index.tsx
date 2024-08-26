import 'allotment/dist/style.css'
import 'index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { Main } from 'Main'
import { env } from 'utils'
import { bufferedLogger } from 'utils/wrappedlogger'
import { initDatadog } from './datadog'

if (!env.DEV) {
    console.log = bufferedLogger.getLogger().info
    console.info = bufferedLogger.getLogger().info
    console.warn = bufferedLogger.getLogger().warn
    console.debug = bufferedLogger.getLogger().debug
    console.error = bufferedLogger.getLogger().error
}

console.log(
    `%c\n\nTOWNS\n%c${VITE_APP_MODE}\n${VITE_APP_COMMIT_HASH}\n${new Date(
        VITE_APP_TIMESTAMP,
    ).toLocaleString()}\n${env.DEV ? 'DEV' : ''}${'\n'.repeat(3)}`,
    `font-size:32px;font-weight:bold;font-family:sans-serif;`,
    ``,
)

// fixes: uncaught ReferenceError: global is not defined for 3rd party libs
window.global ||= globalThis

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

initDatadog()

const node = document.getElementById('root')

if (!node) {
    // this would happen if HTML is malformed or absent
    throw new Error('no root node enable')
}

createRoot(node).render(<Main />)
