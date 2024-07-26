import { useEffect, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { debug } from 'debug'
import { useEvent } from 'react-use-event-hook'
import { MINUTE_MS } from 'data/constants'
import { env } from 'utils'
import { PATHS } from 'routes'

const log = debug('app:updating')
log.enabled = true

const UPDATE_INTERVAL_MS = 5 * MINUTE_MS

export const usePeriodicUpdates = () => {
    const intervalRef = useRef<NodeJS.Timeout>()

    const registration = useRegisterSW({
        onRegisteredSW: (swUrl, registration) => {
            log('registered:' + registration)

            if (!registration) {
                return
            }

            if (env.DEV) {
                if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
                    // doesn't seem to update the service worker in dev mode without this
                    registration?.update()
                }
                return
            }

            const checkInterval = () => {
                log('checking for updates...')
                if (!(!registration.installing && navigator)) {
                    log('already installing')
                    return
                }
                if ('connection' in navigator && !navigator.onLine) {
                    return
                }
                const asyncUpdate = async () => {
                    try {
                        const resp = await fetch(swUrl, {
                            cache: 'no-store',
                            headers: {
                                cache: 'no-store',
                                'cache-control': 'no-cache',
                            },
                        })
                        if (resp?.status === 200) {
                            log('status 200, updating...')
                            await registration.update()
                        } else {
                            log('skip updating', resp?.status)
                        }
                    } catch (error) {
                        console.error('sw: reload prompt, error checking for update', error)
                    }
                }
                asyncUpdate()
            }
            if (intervalRef.current) {
                log('clearing interval')
                clearInterval(intervalRef.current)
            }
            log('installing interval')
            intervalRef.current = setInterval(checkInterval, UPDATE_INTERVAL_MS)
        },
    })

    const [needRefresh] = registration.needRefresh
    const updateServiceWorker = useEvent(() => registration.updateServiceWorker())

    useEffect(() => {
        if (needRefresh) {
            log('needRefresh...')
            // there's an update, check if it's not a patch update
            void getShouldSkipPrompt().then((force) => {
                if (force) {
                    updateServiceWorker()
                }
            })
        }
    }, [needRefresh, updateServiceWorker])
}

export async function clearAllWorkers() {
    const registrations = await navigator.serviceWorker.getRegistrations()
    for (const registration of registrations) {
        const result = await registration.unregister()
        log(result ? 'successfully unregistered' : 'failed to unregister')
    }
}

if (env.DEV) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.clearAllWorkers = () => clearAllWorkers().then(window.location.reload)
}

/**
 * Returns true if version from the server differs from the current version
 * with a major or minor version number.
 */
async function getShouldSkipPrompt() {
    log('usePeriodicUpdates: checkVersionAndUpdate')
    const oldVersion = VITE_APP_VERSION

    if (
        window.location.pathname === '/' ||
        window.location.pathname.match(new RegExp(`^/${PATHS.SPACES}/[0-9a-f]{64}/?$`))
    ) {
        log('usePeriodicUpdates: pathcheck: safe to skip prompt')
        return true
    }

    try {
        const response = await fetch('/version')
        const data = await response.json()
        const newVersion = data?.version
        const skipPrompt = newVersion && isBreakingUpdate(oldVersion, newVersion)
        log('usePeriodicUpdates: getShouldSkipPrompt', {
            skipPrompt,
            oldVersion,
            newVersion,
        })
        return skipPrompt
    } catch (error) {
        console.error('usePeriodicUpdates: getShouldSkipPrompt error', error)
        return false
    }
}

/**
 * Check if a version update is a breaking change, i.e. not a patch update.
 */
function isBreakingUpdate(version1: string, version2: string): boolean {
    // Split version strings into components
    const components = [version1, version2].map((v) => v.split('.').map(Number))
    // Ensure both versions have at least one component
    if (components.some((c) => c.length !== 3)) {
        console.warn('usePeriodicUpdates: isBreakingUpdate: invalid version string')
        return false
    }
    // Compare major and minor version
    return components[0][0] !== components[1][0] || components[0][1] !== components[1][1]
}
