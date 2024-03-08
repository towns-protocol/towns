import 'index.css'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { env } from 'utils'
import { Box, Paragraph } from '@ui'
import { darkTheme } from 'ui/styles/vars.css'
import { ReloadPrompt } from '@components/ReloadPrompt/ReloadPrompt'
import { useRootTheme } from 'hooks/useRootTheme'
import { FontLoader } from 'ui/utils/FontLoader'
import { usePeriodicUpdates } from 'hooks/usePeriodicUpdates'

/**
 *
 *  FOR DEBUG PURPOSES - SCALED DOWN VERSION OF THE APP
 *  ---------------------------------------------------
 *  builds extremely fast and is usefule for debugging
 *  production builds - in combo with `yarn build --watch`
 *  ---------------------------------------------------
 *  just reference the `index-debug.tsx` in `index.html`
 *
 */

console.log(
    `%c\n\nTOWNS\n%c${APP_VERSION}[${APP_COMMIT_HASH}]\n${env.DEV ? 'DEV' : ''}${'\n'.repeat(3)}`,
    `font-size:32px;font-weight:bold;font-family:sans-serif;`,
    ``,
)

// fixes: uncaught ReferenceError: global is not defined for 3rd party libs
window.global ||= globalThis

FontLoader.init()

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

const node = document.getElementById('root')

if (!node) {
    // this would happen if HTML is malformed or absent
    throw new Error('no root node enable')
}

createRoot(node).render(<Main />)

function Main() {
    useRootTheme({
        ammendHTMLBody: true,
        useDefaultOSTheme: true,
    })

    return (
        <Box centerContent absoluteFill className={darkTheme}>
            <Paragraph>Minimal version of the app</Paragraph>
            <Paragraph>Fast to rebuild --watch</Paragraph>
            <Updater />
            <ReloadPrompt />
        </Box>
    )
}

function Updater() {
    usePeriodicUpdates()
    return (
        <Box centerContent absoluteFill className={darkTheme}>
            <ReloadPrompt />
        </Box>
    )
}
