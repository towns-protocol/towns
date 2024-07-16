import {
    ApiCallback,
    ApiObject,
    ApiOptions,
    IdentifyTraits,
    RudderAnalytics,
} from '@rudderstack/analytics-js'
import { useCallback, useRef } from 'react'
import { keccak256 } from 'ethers/lib/utils'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { TownsAnalytics } from 'use-towns-client'
import { env, isTest } from 'utils'
import { getBrowserName, isAndroid, isIOS, isPWA } from './useDevice'

const ANOYNOMOUS_ID = 'analytics-anonymousId'
const isProd = !env.DEV && !isTest()

export class Analytics implements TownsAnalytics {
    private static instance: Analytics
    private _pseudoId: string | undefined
    private readonly analytics: RudderAnalytics
    public readonly commoneProperties: ApiObject
    public readonly trackedEvents: Set<string> = new Set()

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
            const pluginsSDKBaseURL = env.VITE_RUDDERSTACK_PLUGINS_SDK_URL
            const isAnalyticsConfigured = writeKey && dataPlaneUrl && destSDKBaseURL && configUrl

            if (!isAnalyticsConfigured) {
                console.warn('[analytics] Analytics is not enabled in production!')
                return
            }

            const analyticsInstance = new RudderAnalytics()
            analyticsInstance.load(writeKey, dataPlaneUrl, {
                useBeacon: true,
                destSDKBaseURL,
                pluginsSDKBaseURL,
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

    public trackOnce(event: string, properties?: ApiObject, callback?: ApiCallback) {
        if (this.trackedEvents.has(event)) {
            return
        } else {
            this.trackedEvents.add(event)
        }

        this.track(event, properties, callback)
    }
}

export function useAnalytics() {
    const analyticsRef = useRef<Analytics>()

    const getAnalyticsInstance = useCallback(() => {
        if (isProd && !analyticsRef.current) {
            const analyticsInstance = Analytics.getInstance()
            if (analyticsInstance) {
                analyticsRef.current = analyticsInstance
            }
        }
        return analyticsRef.current
    }, [])

    return {
        analytics: getAnalyticsInstance(),
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

export function getChannelType(channelId: string) {
    return isDMChannelStreamId(channelId)
        ? 'dm'
        : isGDMChannelStreamId(channelId)
        ? 'gdm'
        : isChannelStreamId(channelId)
        ? 'channel'
        : 'unknown'
}

function getCommonAnalyticsProperties(): ApiObject {
    const device = isIOS() ? 'ios' : isAndroid() ? 'android' : 'desktop'
    const platform = isPWA() ? 'pwa' : 'browser'
    return {
        anonymousId: getAnonymousId(),
        browserName: getBrowserName(),
        device,
        platform,
    }
}
