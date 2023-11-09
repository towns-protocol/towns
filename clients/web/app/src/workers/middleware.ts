import { env } from '../utils/environment'
import { bcChannelFactory } from './bcChannelFactory'

export function interceptPrivyRequests(worker: ServiceWorkerGlobalScope) {
    const PRIVY_URL = `https://auth.privy.io/api/v1/apps/${env.VITE_PRIVY_ID}`
    const TIMEOUT = 9_000
    const LATENCY_ERROR_MESSAGE = 'Request is taking a long time.'
    const bcChannel = bcChannelFactory('PRIVY_FAILURE')

    worker.addEventListener('fetch', function (event) {
        const { request } = event

        if (request.url === PRIVY_URL) {
            const originalResponsePromise = fetch(PRIVY_URL, request.clone())
            // if the original request fails, or takes too long
            // then we want to send a message to the client
            Promise.race([
                originalResponsePromise.then(async (response) => {
                    if (response && (response.status < 200 || response.status > 300)) {
                        throw new Error(JSON.stringify(await response.json()))
                    }
                }),
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject(new Error(LATENCY_ERROR_MESSAGE))
                    }, TIMEOUT)
                }),
            ]).catch((error) => {
                console.error('sw: interceptPrivyRequests: error', error)
                if (error.message === LATENCY_ERROR_MESSAGE) {
                    bcChannel.postMessage({ type: 'PRIVY_LATENCY' })
                } else {
                    bcChannel.postMessage({ type: 'PRIVY_ERROR' })
                }
            })

            // just to return the original response to privy sdk
            event.respondWith(originalResponsePromise)
        }
    })
}
