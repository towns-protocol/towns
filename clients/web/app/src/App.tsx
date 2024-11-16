import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useEffect, useMemo, useRef } from 'react'
import { TownsContextProvider, ZTEvent } from 'use-towns-client'
import { Helmet } from 'react-helmet'
import { isDefined } from '@river-build/sdk'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEvent } from 'react-use-event-hook'
import { Notifications } from '@components/Notifications/Notifications'
import { useDevice } from 'hooks/useDevice'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { useWindowListener } from 'hooks/useWindowListener'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { Figma } from 'ui/styles/palette'
import { AppBadge, FaviconBadge } from '@components/AppBadges/AppBadges'
import { AppNotifications } from '@components/AppNotifications/AppNotifications'
import { DEFAULT_UNPACK_ENVELOPE_OPTS, useStore } from 'store/store'
import { RegisterPushSubscription } from '@components/RegisterPushSubscription/RegisterPushSubscription'
import { AllRoutes } from 'AllRoutes'
import { ServiceWorkerMetadataSyncer } from 'workers/ServiceWorkerMetadataSyncer'
import DebugBar from '@components/DebugBar/DebugBar'
import { BlockchainTxNotifier } from '@components/Web3/BlockchainTxNotifier'
import { MonitorJoinFlow } from 'routes/PublicTownPage/MontiorJoinFlow'
import { getRouteParams } from 'routes/SpaceContextRoute'
import {
    LINKED_NOTIFICATION_KIND,
    LINKED_NOTIFICATION_NAME,
    LINKED_NOTIFICATION_REL_ENTRY,
    LINKED_RESOURCE,
    NotificationRelEntry,
} from 'data/rel'
import { Analytics } from 'hooks/useAnalytics'
import { useNotificationRoute } from 'hooks/useNotificationRoute'
import { useOfflineToast } from '@components/Offline/OfflineToast'
import { UserOpTxModal } from '@components/Web3/UserOpTxModal/UserOpTxModal'
import { CombinedAuthContextProvider } from 'privy/useCombinedAuth'
import { useRiverConnectedSuccessfullyAnalyticsEvent } from '@components/Analytics/useRiverConnectedSuccessfullyAnalyticsEvent'

FontLoader.init()

const DEFAULT_TIMELINE_FILTER = new Set([ZTEvent.Fulfillment, ZTEvent.KeySolicitation]) // we don't need to see these in the ui

const analyticsInstance = Analytics.getInstance()

export const App = () => {
    const theme = useStore((state) => state.getTheme())
    const spaceIdBookmark = useStore((state) => state.spaceIdBookmark)
    const townRouteBookmarks = useStore((state) => state.townRouteBookmarks)
    const unpackEnvelopeOpts =
        useStore((state) => state.unpackEnvelopeOpts) ?? DEFAULT_UNPACK_ENVELOPE_OPTS

    const { isTouch } = useDevice()

    const highPriorityStreamIds = useRef<string[]>([])
    const isFirstRender = useRef(false)

    const channelBookmark = isDefined(spaceIdBookmark)
        ? townRouteBookmarks[spaceIdBookmark]
        : undefined
    const didSetHighpriorityStreamIds = useRef<boolean>(false)
    const { urlPathnameSafeToNavigate } = useNotificationRoute()
    const navigate = useNavigate()

    // FIXME: this is not great, we don't directly use bookmarks for mobile, we should
    // have a channel history stack with the latest 2-5 channels instead
    // independent to bookmarks
    const { spaceId, channelId } = useMemo(() => getRouteParams(channelBookmark), [channelBookmark])
    const [searchParams] = useSearchParams()

    if (!didSetHighpriorityStreamIds.current) {
        didSetHighpriorityStreamIds.current = true
        highPriorityStreamIds.current = [channelId, spaceId].filter(isDefined)
    }

    useWindowListener()

    const environment = useEnvironment()

    // Log environment changes
    useEffect(() => {
        console.log('Environment: ', {
            current: environment.id,
            currentEnv: ENVIRONMENTS.find(({ id }) => id === environment.id),
        })
    }, [environment.id])

    const supportedXChainRpcMapping = useMemo(() => {
        const config = env.VITE_XCHAIN_CONFIG
        if (!config) {
            console.warn('No XCHAIN config found')
            return {}
        }
        return validateAndParse(config)
    }, [])

    const { rel, notificationEntry, notificationKind } = useMemo(() => {
        return {
            rel: searchParams.get(LINKED_RESOURCE) ?? '',
            notificationEntry: searchParams.get(LINKED_NOTIFICATION_REL_ENTRY),
            notificationKind: searchParams.get(LINKED_NOTIFICATION_KIND),
        }
    }, [searchParams])

    const navigateTo = useEvent((path: string) => {
        navigate(path, { state: { fromNotification: true } })
    })

    useOfflineToast()

    useEffect(() => {
        // when the App is rendered for the first time, we need to check if we
        // have a notification
        if (!isFirstRender.current) {
            return
        }
        // if the app is launched from a notification, we need to navigate to it
        if (
            rel.includes(LINKED_NOTIFICATION_NAME) &&
            notificationEntry?.includes(NotificationRelEntry.OpenWindow) &&
            channelId
        ) {
            const tracked = {
                spaceId,
                channelId,
                rel,
                notificationEntry,
                notificationKind,
            }
            Analytics.getInstance().track('clicked notification', tracked, () => {
                console.log('[analytics][App][route] clicked notification', tracked)
            })

            const url = new URL(window.location.href)
            const safeUrl = urlPathnameSafeToNavigate(url.pathname, channelId)
            console.log(
                `[App][route] on notification ${NotificationRelEntry.OpenWindow}, navigate to`,
                safeUrl,
            )
            navigateTo(safeUrl)
        }
    })

    return (
        <TownsContextProvider
            environmentId={environment.id}
            baseChain={environment.baseChain}
            baseConfig={environment.baseChainConfig}
            riverChain={environment.riverChain}
            riverConfig={environment.riverChainConfig}
            timelineFilter={DEFAULT_TIMELINE_FILTER}
            riverNotificationServiceUrl={env.VITE_RIVER_NOTIFICATION_SERVICE_URL}
            accountAbstractionConfig={environment.accountAbstractionConfig}
            highPriorityStreamIds={highPriorityStreamIds.current}
            unpackEnvelopeOpts={unpackEnvelopeOpts}
            supportedXChainRpcMapping={supportedXChainRpcMapping}
            ethMainnetRpcUrl={env.VITE_ETHEREUM_RPC_URL}
            analytics={analyticsInstance}
            streamMetadataUrl={env.VITE_RIVER_STREAM_METADATA_URL}
        >
            <CombinedAuthContextProvider>
                <>
                    <FaviconBadge />
                    <AppBadge />
                    <AppNotifications />
                    <RegisterPushSubscription />
                    <Helmet>
                        <meta
                            name="theme-color"
                            content={
                                isTouch
                                    ? theme === 'dark'
                                        ? Figma.DarkMode.Level1
                                        : Figma.LightMode.Level1
                                    : theme === 'dark'
                                    ? Figma.DarkMode.Readability
                                    : Figma.LightMode.Readability
                            }
                        />
                    </Helmet>
                    <>
                        {env.DEV && !env.VITE_DISABLE_DEBUG_BARS && <DebugBar {...environment} />}
                        <AllRoutes />
                    </>
                    {!env.VITE_DISABLE_DEBUG_BARS && (
                        <ReactQueryDevtools position="bottom" initialIsOpen={false} />
                    )}
                    <Notifications />
                    <BlockchainTxNotifier />
                    <ServiceWorkerMetadataSyncer />
                    <MonitorJoinFlow />
                    <UserOpTxModal />
                    <TrackRiverConnectedSuccessfully />
                </>
            </CombinedAuthContextProvider>
        </TownsContextProvider>
    )
}

export default App

interface ParsedObject {
    [key: number]: string
}

const validateAndParse = (input: string): ParsedObject => {
    const obj: ParsedObject = {}
    const urlPattern: RegExp = /^(http|https):\/\/[^\s/$.?#].[^\s]*$/
    const pairs: string[] = input.split(',')

    pairs.forEach((pair) => {
        const colonIndex = pair.indexOf(':')
        if (colonIndex === -1) {
            throw new Error(`Invalid pair: "${pair}". Each pair must be in the format key:url.`)
        }
        const key = pair.substring(0, colonIndex)
        const value = pair.substring(colonIndex + 1)

        if (!key || !value) {
            throw new Error(`Invalid pair: "${pair}". Each pair must be in the format key:url.`)
        }

        const keyNumber = Number(key)

        if (isNaN(keyNumber)) {
            throw new Error(`Invalid key: "${key}". Key must be a number.`)
        }

        if (!urlPattern.test(value)) {
            throw new Error(`Invalid URL: "${value}". Value must be a valid URL.`)
        }

        obj[keyNumber] = value
    })

    return obj
}

function TrackRiverConnectedSuccessfully() {
    useRiverConnectedSuccessfullyAnalyticsEvent()
    return null
}
