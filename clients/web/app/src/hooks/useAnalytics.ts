import {
    ApiCallback,
    ApiObject,
    ApiOptions,
    IdentifyTraits,
    RudderAnalytics,
} from '@rudderstack/analytics-js'
import { useEffect, useState } from 'react'
import { keccak256 } from 'ethers/lib/utils'
import { env, isTest } from 'utils'
import { isAndroid, isIOS, isPWA } from './useDevice'

const ANOYNOMOUS_ID = 'analytics-anonymousId'
const isProd = !env.DEV && !isTest()

export class Analytics {
    private static instance: Analytics
    private _pseudoId: string | undefined
    private readonly analytics: RudderAnalytics
    public readonly commoneProperties: ApiObject

    private constructor(analytics: RudderAnalytics) {
        this.analytics = analytics
        this.commoneProperties = getCommonAnalyticsProperties()
    }

    public static getInstance(): Analytics | undefined {
        if (!isProd) {
            return
        }

        if (!Analytics.instance) {
            const writeKey = env.VITE_RUDDERSTACK_WRITE_KEY
            const dataPlaneUrl = env.VITE_RUDDERSTACK_DATA_PLANE_URL
            const destSDKBaseURL = env.VITE_RUDDERSTACK_CDN_SDK_URL
            const configUrl = env.VITE_RUDDERSTACK_API_CONFIG_URL
            const isAnalyticsConfigured = writeKey && dataPlaneUrl && destSDKBaseURL && configUrl

            if (!isAnalyticsConfigured) {
                console.warn('[analytics] Analytics is not enabled in production!')
                return
            }

            const analyticsInstance = new RudderAnalytics()
            analyticsInstance.load(writeKey, dataPlaneUrl, {
                useBeacon: true,
                destSDKBaseURL,
                configUrl,
            })
            analyticsInstance.ready(() => {
                console.log('[analytics] Analytics is ready!')
            })
            Analytics.instance = new Analytics(analyticsInstance)
        }

        return Analytics.instance
    }

    public get anonymousId() {
        return getAnonymousId()
    }

    public get pseudoId(): string | undefined {
        return this._pseudoId
    }

    public setPseudoId(userId: string): string {
        this._pseudoId = getPseudoId(userId)
        return this._pseudoId
    }

    public identify(userId: string, traits?: IdentifyTraits | ApiOptions, callback?: ApiCallback) {
        this.analytics.identify(userId, traits, callback)
    }

    public page(category?: string, name?: string, properties?: ApiObject, callback?: ApiCallback) {
        this.analytics.page(
            category,
            name,
            {
                ...properties,
                ...this.commoneProperties,
            },
            callback,
        )
    }

    public track(event: string, properties?: ApiObject, callback?: ApiCallback) {
        this.analytics.track(
            event,
            {
                ...properties,
                ...this.commoneProperties,
            },
            callback,
        )
    }
}

export function useAnalytics() {
    const [analytics, setAnalytics] = useState<Analytics>()

    useEffect(() => {
        if (isProd) {
            if (!analytics) {
                const analyticsInstance = Analytics.getInstance()
                if (analyticsInstance) {
                    setAnalytics(analyticsInstance)
                }
            }
        }
    }, [analytics])

    return {
        analytics,
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

function getCommonAnalyticsProperties(): ApiObject {
    const device = isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop'
    const platform = isPWA() ? 'pwa' : 'browser'
    return {
        device,
        platform,
    }
}
