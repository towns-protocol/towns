import { useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { debug } from 'debug'
import { MINUTE_MS } from 'data/constants'
import { env } from 'utils'
import { usePanelActions } from 'routes/layouts/hooks/usePanelActions'

const log = debug('app:updating')
log.enabled = true

const UPDATE_INTERVAL_MS = 5 * MINUTE_MS

export const usePeriodicUpdates = () => {
    const intervalRef = useRef<NodeJS.Timeout>()
    const { isPanelOpen } = usePanelActions()
    const isBugReportActive = isPanelOpen('bug-report')

    useRegisterSW({
        onRegisteredSW: (swUrl, registration) => {
            log('registered:' + registration)
            if (env.DEV) {
                if (env.VITE_PUSH_NOTIFICATION_ENABLED) {
                    // doesn't seem to update the service worker in dev mode without this
                    registration?.update()
                }
                return
            }
            if (registration) {
                const checkInterval = () => {
                    log('checking for updates...')
                    if (isBugReportActive) {
                        log('skip update because bug report is active')
                        return
                    }
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
            }
        },
    })
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
