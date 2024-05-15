import { useCallback, useEffect, useMemo, useState } from 'react'
import { RudderAnalytics } from '@rudderstack/analytics-js'
import { keccak256 } from 'ethers/lib/utils'
import { env, isTest } from 'utils'

const ANOYNOMOUS_ID = 'analytics-anonymousId'

export function useAnalytics() {
    const [analytics, setAnalytics] = useState<RudderAnalytics>()
    const [pseudoId, setPseudoId] = useState<string | undefined>()

    const anonymousId = useMemo(() => getAnonymousId(), [])
    const writeKey = env.VITE_RUDDERSTACK_WRITE_KEY
    const dataPlaneUrl = env.VITE_RUDDERSTACK_DATA_PLANE_URL
    const isProd = !env.DEV && !isTest()
    const isAnalyticsConfigured = writeKey && dataPlaneUrl

    const _setPseudoId = useCallback((userId: string) => {
        const pseudoId = getPseudoId(userId)
        setPseudoId(pseudoId)
        return pseudoId
    }, [])

    useEffect(() => {
        if (isProd) {
            if (!isAnalyticsConfigured) {
                console.warn('[analytics] Analytics is not enabled in production!')
            } else if (isAnalyticsConfigured && !analytics) {
                const analyticsInstance = new RudderAnalytics()
                analyticsInstance.load(writeKey, dataPlaneUrl, {
                    useBeacon: true,
                })
                analyticsInstance.ready(() => {
                    console.log('[analytics] Analytics is ready!')
                })

                setAnalytics(analyticsInstance)
            }
        }
    }, [analytics, dataPlaneUrl, isAnalyticsConfigured, isProd, writeKey])

    return {
        analytics,
        anonymousId,
        pseudoId,
        setPseudoId: _setPseudoId,
    } as const
}

export function getAnonymousId() {
    let anonymousId = localStorage.getItem(ANOYNOMOUS_ID)

    if (!anonymousId) {
        anonymousId = crypto.randomUUID()
        localStorage.setItem(ANOYNOMOUS_ID, anonymousId)
    }

    return anonymousId
}

export function clearAnonymousId() {
    localStorage.removeItem(ANOYNOMOUS_ID)
}

export function getPseudoId(userId: string) {
    return keccak256(userId)
}

export function replaceOAuthParameters(searchParamsString: string) {
    const params = new URLSearchParams(searchParamsString)

    // Replace values for 'privy_oauth_state' and 'privy_oauth_code'
    if (params.has('privy_oauth_state')) {
        params.set('privy_oauth_state', '...')
    }
    if (params.has('privy_oauth_code')) {
        params.set('privy_oauth_code', '...')
    }

    return params.toString()
}
