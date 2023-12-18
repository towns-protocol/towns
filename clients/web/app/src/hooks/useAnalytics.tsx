import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import * as amplitudeLib from '@amplitude/analytics-browser'
import isEqual from 'lodash/isEqual'
import { RoomIdentifier, SendMessageOptions, ZionContext } from 'use-zion-client'
import { getUrls } from '../utils/ztevent_util'
import { env } from '../utils/environment'

interface Analytics {
    // this function is a wrapper around amplitude's track function.
    // it has the same arguments, but it returns an unknown type.
    // we never want to depend on the return type of the amplitude track function
    // inside our application layer. we just want to fire and forget.
    track: (...args: Parameters<(typeof amplitudeLib)['track']>) => unknown
    setUserId: (...args: Parameters<(typeof amplitudeLib)['setUserId']>) => unknown
    getUserId: () => string | undefined
}

const UNITITIALIZED_ANALYTICS: Analytics = {
    track: (...args) => {
        console.debug(
            'Analytics not initialized, but track was called with the following arguments:',
        )
        args.forEach(console.debug)
    },
    setUserId: (...args) => {
        console.debug(
            'Analytics not initialized, but setUserId was called with the following arguments:',
        )
        args.forEach(console.debug)
    },
    getUserId: () => {
        console.debug('Analytics not initialized')
        return 'UNITITIALIZED_ANALYTICS'
    },
}

const AnalyticsContext = createContext<Analytics>(UNITITIALIZED_ANALYTICS)

export const AnalyticsProvider = ({ children }: { children: React.ReactNode }) => {
    const [analytics, setAnalytics] = useState<Analytics>(UNITITIALIZED_ANALYTICS)

    useEffect(() => {
        if (env.VITE_AMPLITUDE_KEY) {
            if (env.VITE_AMP_WORKER_URL == undefined) {
                console.warn('VITE_AMP_WORKER_URL is not defined')
                amplitudeLib.init(env.VITE_AMPLITUDE_KEY, undefined, {
                    appVersion: APP_VERSION,
                })
            } else {
                amplitudeLib.init(env.VITE_AMPLITUDE_KEY, undefined, {
                    appVersion: APP_VERSION,
                    serverUrl: env.VITE_AMP_WORKER_URL,
                })
            }

            setAnalytics(amplitudeLib)
            console.debug('Amplitude key found. Initializing analytics.')
        } else {
            console.debug('Amplitude key not found. Skipping analytics initialization.')
        }
    }, [])

    const onCreateSpace = useCallback(
        (roomIdentifier: RoomIdentifier) => {
            analytics.track('create_space', {
                slug: roomIdentifier.streamId,
                networkId: roomIdentifier.streamId,
            })
        },
        [analytics],
    )

    const onJoinRoom = useCallback(
        (roomId: RoomIdentifier, spaceId: RoomIdentifier) => {
            if (isEqual(roomId, spaceId)) {
                analytics.track('join_space', {
                    slug: roomId.streamId,
                    networkId: roomId.streamId,
                    spaceId: spaceId.streamId,
                })
            } else {
                analytics.track('join_channel', {
                    slug: roomId.streamId,
                    networkId: roomId.streamId,
                    spaceId: spaceId.streamId,
                })
            }
        },
        [analytics],
    )

    const onSendMessage = useCallback(
        (roomId: RoomIdentifier, body: string, sendMessageOptions?: SendMessageOptions) => {
            const isURL = getUrls(body).length > 0
            analytics.track('send_message', {
                slug: roomId.streamId,
                networkId: roomId.streamId,
                messageType: sendMessageOptions?.messageType,
                isInThread: !!sendMessageOptions?.threadId,
                isURL,
                spaceId: sendMessageOptions?.parentSpaceId?.streamId,
            })
        },
        [analytics],
    )

    const onLogin = useCallback(
        ({ userId }: { userId: string }) => {
            analytics.setUserId(userId)
            analytics.track('wallet_login_success')
        },
        [analytics],
    )

    const onLogout = useCallback(() => {
        amplitudeLib.reset()
    }, [])

    // note aellis 2/2023 this isn't the standard way to get the client from the context
    // use useZionContext() instead, but we were crashing a lot here on local host, maybe
    // something is trying to useAnalytics during loading or initializtion.
    const zionContext = useContext(ZionContext)
    // note jterzis 04/2023 must use client singleton when setting event handlers
    // since it is instantiated prior to matrix registration
    const clientSingleton = zionContext?.clientSingleton

    useEffect(() => {
        clientSingleton?.setEventHandlers({
            onCreateSpace,
            onJoinRoom,
            onSendMessage,
            onLogin,
            onLogout,
        })

        return () => {
            clientSingleton?.setEventHandlers(undefined)
        }
    }, [onCreateSpace, onJoinRoom, onSendMessage, clientSingleton, onLogin, onLogout])

    return <AnalyticsContext.Provider value={analytics}>{children}</AnalyticsContext.Provider>
}

export const useAnalytics = () => React.useContext(AnalyticsContext)
