import {
    ApiCallback,
    ApiObject,
    ApiOptions,
    IdentifyTraits,
    RudderAnalytics,
} from '@rudderstack/analytics-js'
import { keccak256 } from 'ethers/lib/utils'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from '@river-build/sdk'
import { TownsAnalytics } from 'use-towns-client'
import { datadogLogs } from '@datadog/browser-logs'
import { env } from 'utils'
import { UserAgentInstance, getBrowserName, isPWA } from './useDevice'

const USER_ID_KEY = 'analytics-userId'

interface IAnalyticsBackend {
    track(event: string, properties?: ApiObject, callback?: ApiCallback): void
    page(category?: string, name?: string, properties?: ApiObject, callback?: ApiCallback): void
    identify(
        pseudoId: string | undefined,
        traits: IdentifyTraits | ApiOptions | undefined,
        callback?: ApiCallback,
    ): void
    reset(resetId: boolean): void
    getAnonymousId(): string | undefined
}

class LocalhostAnalyticsBackend implements IAnalyticsBackend {
    constructor() {}

    track(event: string, properties?: ApiObject, _callback?: ApiCallback): void {
        console.log('[analytics-localhost] track', event, properties)
    }

    page(category?: string, name?: string, properties?: ApiObject, _callback?: ApiCallback): void {
        console.log('[analytics-localhost] page', category, name, properties)
    }

    identify(
        pseudoId: string | undefined,
        traits: IdentifyTraits | ApiOptions | undefined,
        _callback?: ApiCallback,
    ): void {
        console.log('[analytics-localhost] identify', pseudoId, traits)
    }

    reset(resetId: boolean): void {
        console.log('[analytics-localhost] reset', resetId)
    }

    getAnonymousId(): string | undefined {
        return 'localhost-anonymous-id'
    }
}

export class Analytics implements TownsAnalytics {
    private static instance: Analytics
    private readonly backend: IAnalyticsBackend
    private readonly commonProperties: ApiObject
    private readonly trackedEvents: Set<string> = new Set()
    private _user?: { userId: string | null }

    private constructor(analytics: IAnalyticsBackend) {
        this.backend = analytics
        this.commonProperties = getCommonAnalyticsProperties()
    }

    public static getInstance(): Analytics {
        if (!Analytics.instance) {
            const writeKey = env.VITE_RUDDERSTACK_WRITE_KEY
            const dataPlaneUrl = env.VITE_RUDDERSTACK_DATA_PLANE_URL
            const destSDKBaseURL = env.VITE_RUDDERSTACK_CDN_SDK_URL
            const configUrl = env.VITE_RUDDERSTACK_API_CONFIG_URL
            const pluginsSDKBaseURL = env.VITE_RUDDERSTACK_PLUGINS_SDK_URL
            const isAnalyticsConfigured = writeKey && dataPlaneUrl && destSDKBaseURL && configUrl

            if (!isAnalyticsConfigured) {
                console.warn('[analytics] Analytics is not enabled')
                Analytics.instance = new Analytics(new LocalhostAnalyticsBackend())
            } else {
                const rudder = new RudderAnalytics()
                rudder.load(writeKey, dataPlaneUrl, {
                    useBeacon: true,
                    destSDKBaseURL,
                    pluginsSDKBaseURL,
                    configUrl,
                })
                rudder.ready(() => {
                    console.log('[analytics] Analytics is ready!')
                })
                Analytics.instance = new Analytics(rudder)
            }
        }

        return Analytics.instance
    }

    public setUserId(userId: string) {
        this._user = { userId }
        localStorage.setItem(USER_ID_KEY, userId)
    }

    get pseudoId(): string | undefined {
        if (!this._user) {
            this._user = {
                userId: localStorage.getItem(USER_ID_KEY),
            }
        }
        if (this._user.userId) {
            return makePseudoId(this._user.userId)
        }
        return undefined
    }

    get anonymousId(): string | undefined {
        return this.backend.getAnonymousId()
    }

    public reset() {
        this._user = undefined
        localStorage.removeItem(USER_ID_KEY)
        this.backend.reset(true)
    }

    public identify(traits?: IdentifyTraits | ApiOptions, callback?: ApiCallback) {
        this.backend.identify(this.pseudoId, traits, callback)
    }

    public page(category?: string, name?: string, properties?: ApiObject, callback?: ApiCallback) {
        this.backend.page(
            category,
            name,
            {
                ...properties,
                ...this.commonProperties,
            },
            callback,
        )
    }

    public track(event: string, properties?: ApiObject, callback?: ApiCallback) {
        this.backend.track(
            event,
            {
                ...properties,
                ...this.commonProperties,
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

export function trackError(args: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    error: any
    displayText?: string
    // privy | userop | userop_sponsored | userop_non_sponsored | river | misc
    category: string
    code: number | string
    source: string | undefined
    name?: string
}) {
    const { error, category, displayText, code, name, source } = args
    const message = isErrorLike(error) ? error.message : 'Unknown error'
    datadogLogs.logger.error(`tracked_error ${source} ${category} ${code} ${message} `, {
        data: {
            message,
            displayText,
            code,
            category,
            name,
            source,
        },
    })
}

function isErrorLike(e: unknown) {
    return e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
}

function makePseudoId(userId: string) {
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
    const os = UserAgentInstance.getOS()
    const platform = isPWA() ? 'pwa' : 'browser'
    return {
        browserName: getBrowserName(),
        device: os.name,
        platform,
    }
}
