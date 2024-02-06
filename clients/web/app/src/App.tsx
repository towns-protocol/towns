import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import React, { useEffect, useRef, useState } from 'react'
import { matchPath, useNavigate } from 'react-router'
import { ZTEvent, ZionContextProvider } from 'use-zion-client'
import { Helmet } from 'react-helmet'
import { EmbeddedSignerContextProvider } from '@towns/privy'
import { isDefined } from '@river/sdk'
import { Notifications } from '@components/Notifications/Notifications'
import { useDevice } from 'hooks/useDevice'
import { useEnvironment } from 'hooks/useEnvironmnet'
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
import { AuthContextProvider } from 'hooks/useAuth'
import { useWatchForPrivyRequestErrors } from 'hooks/useWatchForPrivyRequestErrors'
import DebugBar from '@components/DebugBar/DebugBar'
import { BlockchainTxNotifier } from '@components/Web3/BlockchainTxNotifier'
import { SyncNotificationSettings } from '@components/SyncNotificationSettings/SyncNotificationSettings'
import { useAccountAbstractionConfig } from 'userOpConfig'
import { PATHS } from 'routes'
import { useCreateLink } from 'hooks/useCreateLink'

FontLoader.init()

export const App = () => {
    const { theme, mutedChannelIds } = useStore((state) => ({
        theme: state.theme,
        mutedChannelIds: state.mutedChannelIds,
    }))
    const { createLink } = useCreateLink()
    const { isTouch } = useDevice()
    const navigate = useNavigate()

    const highPriorityStreamIds = useRef<string[]>([])
    const [touchInitialLink, setTouchInitialLink] = useState<string | undefined>(undefined)

    const didSetHighpriorityStreamIds = useRef<boolean>(false)
    if (!didSetHighpriorityStreamIds.current) {
        didSetHighpriorityStreamIds.current = true
        const state = useStore.getState()
        const spaceId = state.spaceIdBookmark
        const channelBookmark = spaceId ? state.townRouteBookmarks[spaceId] : undefined
        const match = matchPath(
            {
                path: `/${PATHS.SPACES}/:spaceId/${PATHS.CHANNELS}/:channelId/`,
            },
            channelBookmark ?? '',
        )

        highPriorityStreamIds.current = [match?.params.spaceId, match?.params.channelId].filter(
            isDefined,
        )
        if (match) {
            const link = createLink({
                initial: 'initial',
                spaceId: match.params.spaceId,
                channelId: match.params.channelId,
            })
            setTouchInitialLink(link)
        }
    }
    useEffect(() => {
        if (!isTouch || !touchInitialLink) {
            return
        }
        navigate(touchInitialLink)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [touchInitialLink, isTouch])

    useWindowListener()
    useWatchForPrivyRequestErrors()

    // aellis april 2023, the two server urls and the chain id should all be considered
    // a single piece of state, PROD, TEST, and LOCAL each should have {casablancaUrl, chainId}
    const environment = useEnvironment()
    const accountAbstractionConfig = useAccountAbstractionConfig(environment.chainId)

    return (
        <ZionContextProvider
            mutedChannelIds={mutedChannelIds}
            casablancaServerUrl={environment.casablancaUrl}
            chain={environment.chain}
            timelineFilter={new Set([ZTEvent.Fulfillment, ZTEvent.KeySolicitation])}
            pushNotificationAuthToken={env.VITE_AUTH_WORKER_HEADER_SECRET}
            pushNotificationWorkerUrl={env.VITE_WEB_PUSH_WORKER_URL}
            accountAbstractionConfig={accountAbstractionConfig}
            highPriorityStreamIds={highPriorityStreamIds.current}
        >
            <EmbeddedSignerContextProvider chainId={environment.chainId}>
                <AuthContextProvider>
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
                </AuthContextProvider>
            </EmbeddedSignerContextProvider>
        </ZionContextProvider>
    )
}

export default App
