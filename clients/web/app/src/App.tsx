import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { LOCALHOST_CHAIN_ID, TownsContextProvider, ZTEvent } from 'use-towns-client'
import { Helmet } from 'react-helmet'
import { isDefined } from '@river/sdk'
import { Notifications } from '@components/Notifications/Notifications'
import { useDevice } from 'hooks/useDevice'
import { ENVIRONMENTS, useEnvironment } from 'hooks/useEnvironmnet'
import { useWindowListener } from 'hooks/useWindowListener'
import { FontLoader } from 'ui/utils/FontLoader'
import { env } from 'utils'
import { Figma } from 'ui/styles/palette'
import { AppBadge, FaviconBadge } from '@components/AppBadges/AppBadges'
import { AppNotifications } from '@components/AppNotifications/AppNotifications'
import { useStore } from 'store/store'
import { RegisterPushSubscription } from '@components/RegisterPushSubscription/RegisterPushSubscription'
import { AllRoutes } from 'AllRoutes'
import { ServiceWorkerMetadataSyncer } from 'workers/ServiceWorkerMetadataSyncer'
import DebugBar from '@components/DebugBar/DebugBar'
import { BlockchainTxNotifier } from '@components/Web3/BlockchainTxNotifier'
import { SyncNotificationSettings } from '@components/SyncNotificationSettings/SyncNotificationSettings'
import { useCreateLink } from 'hooks/useCreateLink'
import { MonitorJoinFlow } from 'routes/PublicTownPage/MontiorJoinFlow'
import { getRouteParams } from 'routes/SpaceContextRoute'

FontLoader.init()

const DEFAULT_TIMELINE_FILTER = new Set([ZTEvent.Fulfillment, ZTEvent.KeySolicitation]) // we don't need to see these in the ui

export const App = () => {
    const _envornmentId = useRef<string | undefined>(undefined)
    const { theme, mutedChannelIds } = useStore((state) => ({
        theme: state.getTheme(),
        mutedChannelIds: state.mutedChannelIds,
    }))
    const { createLink } = useCreateLink()
    const { isTouch } = useDevice()
    const navigate = useNavigate()

    const highPriorityStreamIds = useRef<string[]>([])
    const [touchInitialLink, setTouchInitialLink] = useState<string | undefined>(undefined)

    const state = useStore.getState()
    const spaceIdBookmark = state.spaceIdBookmark
    const channelBookmark = isDefined(spaceIdBookmark)
        ? state.townRouteBookmarks[spaceIdBookmark]
        : undefined

    const didSetHighpriorityStreamIds = useRef<boolean>(false)
    if (!didSetHighpriorityStreamIds.current) {
        didSetHighpriorityStreamIds.current = true
        const { spaceId, channelId } = getRouteParams(channelBookmark)
        highPriorityStreamIds.current = [channelId, spaceId].filter(isDefined)

        if (channelId && window.location.pathname === '/') {
            const link = createLink({
                initial: 'initial',
                spaceId: spaceId,
                channelId: channelId,
            })
            console.warn('[App][hnt-5685] setTouchInitialLink', 'route', {
                link,
                deviceType: isTouch ? 'mobile' : 'desktop',
            })
            setTouchInitialLink(link)
        }
    }

    useEffect(() => {
        // DataDog is configured to only log warnings and errors. This is a warning
        // to track and verify that the routing code works after the fix. Will be removed
        // after verification.
        // Reminder to remove: https://linear.app/hnt-labs/issue/HNT-6068/remove-consolewarn-from-the-harmony-app-after-verifying-hnt-5685-is
        console.warn('[App][hnt-5685]', 'route', {
            spaceIdBookmark,
            channelBookmark,
            locationPathname: location.pathname,
            search: location.search,
            highPriorityStreamIds: highPriorityStreamIds.current,
            deviceType: isTouch ? 'mobile' : 'desktop',
        })
    }, [channelBookmark, isTouch, spaceIdBookmark])

    useEffect(() => {
        if (!isTouch || !touchInitialLink) {
            return
        }
        console.log('[hnt-5685] Navigating to initial touch link', touchInitialLink)
        navigate(touchInitialLink)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [touchInitialLink, isTouch])

    useWindowListener()

    const environment = useEnvironment()

    // Log environment changes
    if (environment.id !== _envornmentId.current) {
        _envornmentId.current = environment.id
        console.log('Environment: ', {
            current: environment.id,
            ENVIRONMENTS,
        })
    }

    const supportedXChainRpcMapping = useMemo(() => {
        const supported: { [x: number]: string } = {
            1: env.VITE_XCHAIN_ETHEREUM_RPC_URL,
            137: env.VITE_XCHAIN_POLYGON_RPC_URL,
            42161: env.VITE_XCHAIN_ARBITRUM_RPC_URL,
            10: env.VITE_XCHAIN_OPTIMISM_RPC_URL,
        }

        if (environment.baseChain.id === LOCALHOST_CHAIN_ID && env.VITE_BASE_SEPOLIA_RPC_URL) {
            supported[84532] = env.VITE_BASE_SEPOLIA_RPC_URL
        }
        return supported
    }, [environment.baseChain.id])

    return (
        <TownsContextProvider
            mutedChannelIds={mutedChannelIds}
            environmentId={environment.id}
            baseChain={environment.baseChain}
            baseConfig={environment.baseChainConfig}
            riverChain={environment.riverChain}
            riverConfig={environment.riverChainConfig}
            timelineFilter={DEFAULT_TIMELINE_FILTER}
            pushNotificationAuthToken={env.VITE_AUTH_WORKER_HEADER_SECRET}
            pushNotificationWorkerUrl={env.VITE_WEB_PUSH_WORKER_URL}
            accountAbstractionConfig={environment.accountAbstractionConfig}
            highPriorityStreamIds={highPriorityStreamIds.current}
            supportedXChainRpcMapping={supportedXChainRpcMapping}
        >
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
                <SyncNotificationSettings />
                <Notifications />
                <BlockchainTxNotifier />
                <ServiceWorkerMetadataSyncer />
                <MonitorJoinFlow />
            </>
        </TownsContextProvider>
    )
}

export default App
